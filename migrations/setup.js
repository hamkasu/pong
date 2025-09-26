const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
    try {
        console.log('🔄 Setting up database tables...');

        // Create users table
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
        console.log('✅ Users table created');

        // Create games table
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
        console.log('✅ Games table created');

        // Create indexes for better performance
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_total_score ON users(total_score DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_games_game_mode ON games(game_mode);`);

        console.log('✅ Database indexes created');

        // Insert sample data (optional)
        const sampleUserCheck = await pool.query(
            'SELECT COUNT(*) FROM users WHERE username = $1',
            ['demo_player']
        );

        if (parseInt(sampleUserCheck.rows[0].count) === 0) {
            const bcrypt = require('bcrypt');
            const samplePasswordHash = await bcrypt.hash('password123', 10);
            
            await pool.query(`
                INSERT INTO users (username, email, password_hash, total_score, games_played, games_won, highest_level)
                VALUES 
                    ('demo_player', 'demo@example.com', $1, 150, 12, 8, 4),
                    ('pong_master', 'master@example.com', $1, 280, 20, 15, 7),
                    ('arcade_king', 'king@example.com', $1, 200, 15, 10, 5)
            `, [samplePasswordHash]);
            
            console.log('✅ Sample users created');
            console.log('   📝 Demo accounts:');
            console.log('      • Username: demo_player, Password: password123');
            console.log('      • Username: pong_master, Password: password123');
            console.log('      • Username: arcade_king, Password: password123');
        }

        console.log('🎮 Database setup completed successfully!');
        
        // Test connection
        const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
        console.log(`👥 Total users in database: ${result.rows[0].user_count}`);

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabase };