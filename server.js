const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pong-game-secret-key-change-in-production';
const DATABASE_URL = process.env.DATABASE_URL;

// Database connection
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                total_score INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                games_won INTEGER DEFAULT 0,
                highest_level INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS games (
                id SERIAL PRIMARY KEY,
                game_id VARCHAR(36) UNIQUE NOT NULL,
                player1_id INTEGER REFERENCES users(id),
                player2_id INTEGER REFERENCES users(id),
                player1_score INTEGER DEFAULT 0,
                player2_score INTEGER DEFAULT 0,
                winner_id INTEGER REFERENCES users(id),
                game_mode VARCHAR(20) NOT NULL,
                level INTEGER DEFAULT 1,
                duration INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        `);

        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Game state management
const activeGames = new Map();
const waitingPlayers = new Map();

class GameSession {
    constructor(player1, player2, gameMode = 'online') {
        this.id = uuidv4();
        this.player1 = player1;
        this.player2 = player2;
        this.gameMode = gameMode;
        this.gameState = {
            player1Score: 0,
            player2Score: 0,
            currentLevel: 1,
            ball: { x: 400, y: 200, speedX: 5, speedY: 3 },
            player1Paddle: { y: 150 },
            player2Paddle: { y: 150 },
            gameStatus: 'playing',
            winner: null
        };
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
    }

    updatePaddle(playerId, paddleY) {
        if (playerId === this.player1.id) {
            this.gameState.player1Paddle.y = paddleY;
        } else if (playerId === this.player2.id) {
            this.gameState.player2Paddle.y = paddleY;
        }
        this.lastUpdate = Date.now();
    }

    updateBall(ballState) {
        this.gameState.ball = ballState;
        this.lastUpdate = Date.now();
    }

    updateScore(player1Score, player2Score) {
        this.gameState.player1Score = player1Score;
        this.gameState.player2Score = player2Score;
        
        const maxScore = 7;
        if (player1Score >= maxScore) {
            this.gameState.winner = this.player1.id;
            this.gameState.gameStatus = 'finished';
        } else if (player2Score >= maxScore) {
            this.gameState.winner = this.player2.id;
            this.gameState.gameStatus = 'finished';
        }
        
        this.lastUpdate = Date.now();
    }
}

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, password_hash]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User created successfully',
            user: { id: user.id, username: user.username, email: user.email },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const result = await pool.query(
            'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            user: { id: user.id, username: user.username, email: user.email },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, username, email, total_score, games_played, games_won, highest_level, created_at 
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({ user });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT username, total_score, games_played, games_won, highest_level
             FROM users 
             WHERE games_played > 0
             ORDER BY total_score DESC, games_won DESC, highest_level DESC
             LIMIT 10`
        );

        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/game/result', authenticateToken, async (req, res) => {
    try {
        const { gameMode, level, score, won, opponentId, duration } = req.body;
        
        let query, params;
        if (gameMode === 'singleplayer') {
            query = `
                UPDATE users 
                SET total_score = total_score + $1, 
                    games_played = games_played + 1,
                    games_won = games_won + $2,
                    highest_level = GREATEST(highest_level, $3)
                WHERE id = $4
            `;
            params = [score, won ? 1 : 0, level, req.user.id];
        } else {
            query = `
                UPDATE users 
                SET total_score = total_score + $1, 
                    games_played = games_played + 1,
                    games_won = games_won + $2
                WHERE id = $3
            `;
            params = [score, won ? 1 : 0, req.user.id];
        }
        
        await pool.query(query, params);

        await pool.query(
            `INSERT INTO games (game_id, player1_id, player2_id, player1_score, winner_id, game_mode, level, duration, completed_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
            [uuidv4(), req.user.id, opponentId, score, won ? req.user.id : opponentId, gameMode, level || 1, duration || 0]
        );

        res.json({ message: 'Game result saved' });
    } catch (error) {
        console.error('Save game result error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// WebSocket handling for real-time multiplayer
io.on('connection', (socket) => {
    console.log(`🎮 User connected: ${socket.id}`);

    socket.on('authenticate', (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.id;
            socket.username = decoded.username;
            socket.authenticated = true;
            socket.emit('authenticated', { userId: decoded.id, username: decoded.username });
        } catch (error) {
            socket.emit('auth_error', { message: 'Invalid token' });
        }
    });

    socket.on('find_match', () => {
        if (!socket.authenticated) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }

        waitingPlayers.set(socket.id, {
            id: socket.userId,
            username: socket.username,
            socketId: socket.id
        });

        socket.emit('searching', { message: 'Searching for opponent...' });

        const waitingArray = Array.from(waitingPlayers.values());
        if (waitingArray.length >= 2) {
            const player1 = waitingArray[0];
            const player2 = waitingArray[1];

            waitingPlayers.delete(player1.socketId);
            waitingPlayers.delete(player2.socketId);

            const gameSession = new GameSession(player1, player2, 'online');
            activeGames.set(gameSession.id, gameSession);

            io.sockets.sockets.get(player1.socketId)?.join(gameSession.id);
            io.sockets.sockets.get(player2.socketId)?.join(gameSession.id);

            io.to(gameSession.id).emit('match_found', {
                gameId: gameSession.id,
                player1: { id: player1.id, username: player1.username },
                player2: { id: player2.id, username: player2.username }
            });

            io.sockets.sockets.get(player1.socketId)?.emit('match_found', {
                gameId: gameSession.id,
                player1: { id: player1.id, username: player1.username },
                player2: { id: player2.id, username: player2.username },
                yourPlayerId: player1.id
            });

            io.sockets.sockets.get(player2.socketId)?.emit('match_found', {
                gameId: gameSession.id,
                player1: { id: player1.id, username: player1.username },
                player2: { id: player2.id, username: player2.username },
                yourPlayerId: player2.id
            });
        }
    });

    socket.on('cancel_search', () => {
        waitingPlayers.delete(socket.id);
        socket.emit('search_cancelled');
    });

    socket.on('game_update', (data) => {
        const { gameId, type, payload } = data;
        const game = activeGames.get(gameId);
        
        if (!game || !socket.authenticated) return;

        switch (type) {
            case 'paddle_move':
                game.updatePaddle(socket.userId, payload.y);
                socket.to(gameId).emit('opponent_paddle_move', { y: payload.y });
                break;
                
            case 'ball_update':
                game.updateBall(payload);
                socket.to(gameId).emit('ball_sync', payload);
                break;
                
            case 'score_update':
                game.updateScore(payload.player1Score, payload.player2Score);
                io.to(gameId).emit('score_sync', {
                    player1Score: payload.player1Score,
                    player2Score: payload.player2Score
                });
                
                if (game.gameState.gameStatus === 'finished') {
                    const duration = Math.floor((Date.now() - game.startTime) / 1000);
                    io.to(gameId).emit('game_finished', {
                        winner: game.gameState.winner,
                        finalScore: {
                            player1: game.gameState.player1Score,
                            player2: game.gameState.player2Score
                        },
                        duration
                    });
                    
                    activeGames.delete(gameId);
                }
                break;
        }
    });

    socket.on('disconnect', () => {
        console.log(`🚪 User disconnected: ${socket.id}`);
        waitingPlayers.delete(socket.id);
        
        for (const [gameId, game] of activeGames.entries()) {
            if (game.player1.socketId === socket.id || game.player2.socketId === socket.id) {
                socket.to(gameId).emit('opponent_disconnected');
                activeGames.delete(gameId);
                break;
            }
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        message: 'Pong Levels Online Game Server Running',
        timestamp: new Date().toISOString(),
        activeGames: activeGames.size,
        waitingPlayers: waitingPlayers.size
    });
});

app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
    try {
        await initDatabase();
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🏓 Pong Levels Online server running on port ${PORT}`);
            console.log(`🌐 Access your game at: http://localhost:${PORT}`);
            console.log(`🎮 Real-time multiplayer enabled`);
            console.log(`📊 Database connected`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();