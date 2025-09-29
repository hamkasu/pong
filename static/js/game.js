// Pong Game - Main Game Logic
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameState = 'menu';
let gameMode = 'single';
let animationId;

const game = {
    player1: { x: 20, y: 200, width: 10, height: 80, score: 0, dy: 0 },
    player2: { x: 770, y: 200, width: 10, height: 80, score: 0, dy: 0 },
    ball: { x: 400, y: 200, dx: 5, dy: 3, size: 8 },
    winScore: 7
};

const keys = {};
let lastAIUpdate = 0;
let mouseY = 0;
let mouseEnabled = true;

let leaderboard = [
    { name: "AI Champion", score: 15, mode: "Single" },
    { name: "Pong Master", score: 12, mode: "Multi" },
    { name: "Paddle Pro", score: 10, mode: "Single" }
];

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.currentMusic = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.initAudio();
    }

    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.musicGain.connect(this.audioContext.destination);
            this.sfxGain.connect(this.audioContext.destination);
            this.musicGain.gain.value = 0.3;
            this.sfxGain.gain.value = 0.5;
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    playPaddleHit() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resumeContext();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    playWallHit() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resumeContext();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    playScore() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resumeContext();
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.1);
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + index * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.1 + 0.2);
            oscillator.start(this.audioContext.currentTime + index * 0.1);
            oscillator.stop(this.audioContext.currentTime + index * 0.1 + 0.2);
        });
    }

    playGameWin() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resumeContext();
        const melody = [523.25, 659.25, 783.99, 1046.5];
        melody.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.15);
            gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime + index * 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.15 + 0.3);
            oscillator.start(this.audioContext.currentTime + index * 0.15);
            oscillator.stop(this.audioContext.currentTime + index * 0.15 + 0.3);
        });
    }

    playMenuClick() {
        if (!this.sfxEnabled || !this.audioContext) return;
        this.resumeContext();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }

    startMenuMusic() {
        if (!this.musicEnabled || !this.audioContext || this.currentMusic) return;
        this.resumeContext();
        this.playAmbientMusic(0.3);
    }

    startGameMusic() {
        if (!this.musicEnabled || !this.audioContext) return;
        this.stopMusic();
        this.resumeContext();
        this.playAmbientMusic(0.4);
    }

    playAmbientMusic(tempo) {
        if (!this.audioContext) return;
        const playNote = (freq, duration, delay = 0) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.musicGain);
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + delay);
            filter.frequency.setValueAtTime(freq * 2, this.audioContext.currentTime + delay);
            filter.Q.setValueAtTime(10, this.audioContext.currentTime + delay);
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + delay + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + delay + duration);
            oscillator.start(this.audioContext.currentTime + delay);
            oscillator.stop(this.audioContext.currentTime + delay + duration);
        };

        const pattern = () => {
            const baseFreq = 220;
            const notes = [1, 1.25, 1.5, 1.25];
            notes.forEach((mult, index) => {
                playNote(baseFreq * mult, 1.5, index * tempo);
                playNote(baseFreq * mult * 0.5, 1.5, index * tempo);
            });
        };

        pattern();
        this.currentMusic = setInterval(pattern, tempo * 4 * 1000);
    }

    stopMusic() {
        if (this.currentMusic) {
            clearInterval(this.currentMusic);
            this.currentMusic = null;
        }
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        const btn = document.getElementById('musicBtn');
        if (this.musicEnabled) {
            btn.classList.remove('muted');
            if (gameState === 'menu') this.startMenuMusic();
            else if (gameState === 'playing') this.startGameMusic();
        } else {
            btn.classList.add('muted');
            this.stopMusic();
        }
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        const btn = document.getElementById('sfxBtn');
        if (this.sfxEnabled) {
            btn.classList.remove('muted');
        } else {
            btn.classList.add('muted');
        }
    }
}

const audioManager = new AudioManager();

function toggleMusic() {
    audioManager.toggleMusic();
    audioManager.playMenuClick();
}

function toggleSFX() {
    audioManager.toggleSFX();
    audioManager.playMenuClick();
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'Escape' && gameState === 'playing') {
        pauseGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (gameState === 'playing') {
        const rect = canvas.getBoundingClientRect();
        mouseY = e.clientY - rect.top;
        mouseEnabled = true;
    }
});

canvas.addEventListener('mouseenter', () => {
    if (gameState === 'playing') {
        mouseEnabled = true;
    }
});

canvas.addEventListener('mouseleave', () => {
    mouseEnabled = false;
});

function startGame(mode) {
    audioManager.playMenuClick();
    audioManager.stopMusic();
    gameMode = mode;
    gameState = 'playing';
    game.player1.y = 160;
    game.player2.y = 160;
    game.player1.score = 0;
    game.player2.score = 0;
    game.ball.x = 400;
    game.ball.y = 200;
    game.ball.dx = Math.random() > 0.5 ? 5 : -5;
    game.ball.dy = (Math.random() - 0.5) * 6;
    mouseEnabled = false;
    mouseY = canvas.height / 2;
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    const modeText = mode === 'single' ? 'Single Player vs AI' : 'Multiplayer (Local)';
    document.getElementById('gameMode').textContent = modeText;
    const controlsText = mode === 'single' 
        ? 'Player: Mouse or W/S or ↑/↓ arrows' 
        : 'Player 1: Mouse or W/S • Player 2: ↑/↓ arrows';
    document.getElementById('controlsText').textContent = controlsText;
    audioManager.startGameMusic();
    gameLoop();
}

function pauseGame() {
    if (gameState === 'playing') {
        gameState = 'paused';
        cancelAnimationFrame(animationId);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff00';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Courier New';
        ctx.fillText('Press ESC to resume', canvas.width / 2, canvas.height / 2 + 40);
        setTimeout(() => {
            if (gameState === 'paused') {
                gameState = 'playing';
                gameLoop();
            }
        }, 100);
    }
}

function updateGame() {
    if (mouseEnabled && gameMode === 'single') {
        const targetY = mouseY - game.player1.height / 2;
        const clampedY = Math.max(0, Math.min(canvas.height - game.player1.height, targetY));
        const diff = clampedY - game.player1.y;
        game.player1.dy = diff * 0.2;
        game.player1.y += game.player1.dy;
    } else if (mouseEnabled && gameMode === 'multi') {
        const targetY = mouseY - game.player1.height / 2;
        const clampedY = Math.max(0, Math.min(canvas.height - game.player1.height, targetY));
        const diff = clampedY - game.player1.y;
        game.player1.dy = diff * 0.2;
        game.player1.y += game.player1.dy;
    } else {
        if (keys['w'] || keys['W'] || keys['ArrowUp']) {
            game.player1.dy = -6;
        } else if (keys['s'] || keys['S'] || keys['ArrowDown']) {
            game.player1.dy = 6;
        } else {
            game.player1.dy *= 0.8;
        }
        game.player1.y += game.player1.dy;
    }

    if (gameMode === 'multi') {
        if (keys['ArrowUp']) {
            game.player2.dy = -6;
        } else if (keys['ArrowDown']) {
            game.player2.dy = 6;
        } else {
            game.player2.dy *= 0.8;
        }
    } else {
        const now = Date.now();
        if (now - lastAIUpdate > 50) {
            const paddleCenter = game.player2.y + game.player2.height / 2;
            const ballY = game.ball.y;
            const diff = ballY - paddleCenter;
            if (Math.abs(diff) > 10) {
                game.player2.dy = diff > 0 ? 4 : -4;
            } else {
                game.player2.dy *= 0.9;
            }
            lastAIUpdate = now;
        }
    }

    game.player2.y += game.player2.dy;
    game.player1.y = Math.max(0, Math.min(canvas.height - game.player1.height, game.player1.y));
    game.player2.y = Math.max(0, Math.min(canvas.height - game.player2.height, game.player2.y));
    game.ball.x += game.ball.dx;
    game.ball.y += game.ball.dy;

    if (game.ball.y <= game.ball.size || game.ball.y >= canvas.height - game.ball.size) {
        game.ball.dy = -game.ball.dy;
        game.ball.y = Math.max(game.ball.size, Math.min(canvas.height - game.ball.size, game.ball.y));
        audioManager.playWallHit();
    }

    if (game.ball.x - game.ball.size <= game.player1.x + game.player1.width &&
        game.ball.y >= game.player1.y && game.ball.y <= game.player1.y + game.player1.height) {
        game.ball.dx = Math.abs(game.ball.dx);
        game.ball.dy += (game.player1.dy * 0.2);
        game.ball.dx *= 1.05;
        audioManager.playPaddleHit();
    }

    if (game.ball.x + game.ball.size >= game.player2.x &&
        game.ball.y >= game.player2.y && game.ball.y <= game.player2.y + game.player2.height) {
        game.ball.dx = -Math.abs(game.ball.dx);
        game.ball.dy += (game.player2.dy * 0.2);
        game.ball.dx *= 1.05;
        audioManager.playPaddleHit();
    }

    if (game.ball.x < 0) {
        game.player2.score++;
        audioManager.playScore();
        resetBall();
    } else if (game.ball.x > canvas.width) {
        game.player1.score++;
        audioManager.playScore();
        resetBall();
    }

    if (game.player1.score >= game.winScore || game.player2.score >= game.winScore) {
        endGame();
    }

    document.getElementById('player1Score').textContent = game.player1.score;
    document.getElementById('player2Score').textContent = game.player2.score;
}

function resetBall() {
    game.ball.x = canvas.width / 2;
    game.ball.y = canvas.height / 2;
    game.ball.dx = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 4);
    game.ball.dy = (Math.random() - 0.5) * 6;
}

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#00ff0040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(game.player1.x, game.player1.y, game.player1.width, game.player1.height);
    ctx.fillRect(game.player2.x, game.player2.y, game.player2.width, game.player2.height);
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, game.ball.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function gameLoop() {
    if (gameState === 'playing') {
        updateGame();
        render();
        animationId = requestAnimationFrame(gameLoop);
    }
}

function endGame() {
    gameState = 'gameOver';
    cancelAnimationFrame(animationId);
    audioManager.stopMusic();
    audioManager.playGameWin();
    const winner = game.player1.score >= game.winScore ? 1 : 2;
    const winnerName = gameMode === 'single' 
        ? (winner === 1 ? 'You Win!' : 'AI Wins!') 
        : `Player ${winner} Wins!`;
    document.getElementById('winnerText').textContent = winnerName;
    document.getElementById('finalScore').textContent = 
        `Final Score: ${game.player1.score} - ${game.player2.score}`;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function saveScore() {
    audioManager.playMenuClick();
    const playerName = document.getElementById('playerName').value.trim() || 'Anonymous';
    const score = Math.max(game.player1.score, game.player2.score);
    const mode = gameMode === 'single' ? 'Single' : 'Multi';
    leaderboard.push({ name: playerName, score: score, mode: mode });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    showMainMenu();
}

function showLeaderboard() {
    audioManager.playMenuClick();
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('leaderboardScreen').classList.remove('hidden');
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    if (leaderboard.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #00ff0080;">No scores yet!</div>';
    } else {
        leaderboard.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-entry';
            div.innerHTML = `
                <span>${index + 1}. ${entry.name}</span>
                <span>${entry.score} pts (${entry.mode})</span>
            `;
            list.appendChild(div);
        });
    }
}

function showMainMenu() {
    audioManager.playMenuClick();
    gameState = 'menu';
    cancelAnimationFrame(animationId);
    audioManager.stopMusic();
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('leaderboardScreen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    document.getElementById('playerName').value = '';
    audioManager.startMenuMusic();
}

showMainMenu();

document.addEventListener('click', () => {
    audioManager.resumeContext();
}, { once: true });

document.addEventListener('keydown', (e) => {
    audioManager.resumeContext();
}, { once: true });
