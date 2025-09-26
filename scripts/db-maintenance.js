#!/usr/bin/env node

const { Pool } = require('pg');
const readline = require('readline');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function getDatabaseStats() {
    try {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const gameCount = await pool.query('SELECT COUNT(*) FROM games');
        const topPlayer = await pool.query(
            'SELECT username, total_score FROM users ORDER BY total_score DESC LIMIT 1'
        );
        const recentGames = await pool.query(
            'SELECT COUNT(*) FROM games WHERE created_at > NOW() - INTERVAL \'24 hours\''
        );

        console.log('\n📊 DATABASE STATISTICS');
        console.log('====================');
        console.log(`👥 Total Users: ${userCount.rows[0].count}`);
        console.log(`🎮 Total Games: ${gameCount.rows[0].count}`);
        console.log(`🏆 Top Player: ${topPlayer.rows[0]?.username || 'None'} (${topPlayer.rows[0]?.total_score || 0} points)`);
        console.log(`📅 Games Today: ${recentGames.rows[0].count}`);
        console.log('====================\n');
    } catch (error) {
        console.error('❌ Error getting database stats:', error.message);
    }
}

async function mainMenu() {
    console.log('\n🏓 PONG LEVELS - DATABASE MAINTENANCE');
    console.log('=====================================');
    console.log('1. View Database Statistics');
    console.log('2. Reset Database (DANGER!)');
    console.log('3. Cleanup Old Games'); 
    console.log('4. Create Test Users');
    console.log('5. Export Data');
    console.log('6. Exit');
    console.log('=====================================');
    
    const choice = await askQuestion('Select option (1-6): ');
    
    switch (choice) {
        case '1':
            await getDatabaseStats();
            break;
        case '6':
            console.log('👋 Goodbye!');
            rl.close();
            await pool.end();
            return;
        default:
            console.log('❌ Invalid option');
    }
    
    // Show menu again
    await mainMenu();
}

async function main() {
    try {
        console.log('🔌 Connecting to database...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected');
        
        await mainMenu();
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}