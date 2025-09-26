# 🏓 Pong Levels Online - Railway Deployment

A modern **online multiplayer** Pong game with user accounts, real-time matchmaking, 7 progressive levels, leaderboards, and retro arcade action!

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy)

## ✨ Features

### 🌐 **Real-Time Online Multiplayer**
- Instant matchmaking with players worldwide
- WebSocket-powered real-time gameplay
- Synchronized ball physics and paddle movements
- Disconnect handling and reconnection

### 👤 **User Account System**
- Secure registration and login
- JWT-based authentication  
- Persistent user profiles and statistics
- Password hashing with bcrypt

### 🏆 **Global Leaderboards**
- Top 10 players by total score
- Win rates and game statistics
- Highest level achievements
- Real-time leaderboard updates

### 🎮 Game Modes

1. **Single Player Campaign** - 7 progressive difficulty levels
2. **Local Multiplayer** - Same-device 2-player matches  
3. **Online Multiplayer** - Real-time matches with global players

## 🚂 Railway Deployment

### **Method 1: Automated Script**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### **Method 2: Manual Setup**
```bash
railway login
railway init
railway add --database postgresql
railway up
railway run npm run migrate
```

## 🐳 Docker Development
```bash
docker-compose up
```

## 📊 Database

- PostgreSQL with user accounts and game statistics
- Automatic migration setup
- Demo accounts included (password: password123)

## 🔒 Security Features

- JWT authentication, bcrypt password hashing
- Rate limiting, CORS protection
- Environment variable configuration
- SSL/HTTPS ready

Ready to launch your online gaming empire! 🎮🚀