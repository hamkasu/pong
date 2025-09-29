# 🏓 Pong Game - Railway Deployment

A modern, web-based implementation of the classic Pong game with both single-player and multiplayer modes, ready for Railway deployment.

## 🚀 Deploy to Railway

### One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Manual Deployment Steps

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   cd pong-game
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Open Your Game**
   ```bash
   railway open
   ```

## 🎮 Features

### Game Modes
- **Single Player**: Play against an AI opponent
- **Multiplayer**: Local two-player mode

### Controls
- **Mouse**: Move paddle with mouse (hover over canvas)
- **Keyboard**: W/S or Arrow keys
- **ESC**: Pause/resume

### Audio
- Retro sound effects
- Background music
- Toggle controls (top-right)

### Leaderboard
- Top 10 scores tracking
- Single and multiplayer records

## 📁 Project Structure

```
pong-game/
├── server.py              # Flask server
├── requirements.txt       # Python dependencies
├── Procfile              # Railway start command
├── railway.toml          # Railway configuration
├── .python-version       # Python 3.11
├── static/
│   ├── css/
│   │   └── style.css     # Game styling
│   └── js/
│       └── game.js       # Game logic
├── templates/
│   └── index.html        # Main HTML
└── README.md             # This file
```

## 🔧 Local Development

### Prerequisites
- Python 3.11+
- pip

### Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python server.py

# Open browser
open http://localhost:3000
```

## 🌐 Environment Variables

Railway automatically sets the `PORT` variable. No additional configuration needed!

## 📊 Endpoints

- `/` - Main game interface
- `/health` - Health check endpoint
- `/static/*` - Static assets

## 🎯 Game Rules

1. First to 7 points wins
2. Ball speeds up with each hit
3. Paddle momentum affects ball trajectory
4. ESC to pause anytime

## 🛠️ Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Audio**: Web Audio API
- **Deployment**: Railway
- **Server**: Gunicorn

## 📝 Railway Configuration

The project includes:
- `railway.toml` - Railway deployment settings
- `.python-version` - Python version (3.11)
- `Procfile` - Process startup command
- `requirements.txt` - Python dependencies

Railway's nixpacks will auto-detect Python and install dependencies automatically.

## 🔒 Health Monitoring

The `/health` endpoint provides status information for monitoring:
```json
{
  "status": "healthy",
  "game": "pong"
}
```

## 🐛 Troubleshooting

### "pip: command not found" Error
If you see this during build, Railway's auto-detection should fix it. Try:

**Quick Fix:**
```bash
# Delete the pong-game folder completely
rm -rf pong-game

# Re-run the provisioner  
python provision_pong.py

# Navigate and deploy
cd pong-game
railway up
```

**Alternative Fix - Add nixpacks.toml manually:**
Create `nixpacks.toml` in your project root:
```toml
[phases.setup]
nixPkgs = ["python311", "python311Packages.pip"]

[phases.install]
cmds = ["python -m pip install --upgrade pip", "python -m pip install -r requirements.txt"]

[start]
cmd = "gunicorn server:app --bind 0.0.0.0:$PORT --workers 4"
```

Then redeploy: `railway up`

### "Error creating build plan with Railpack"
This error means Railway couldn't detect the build configuration. Fix:
```bash
# Make sure these files exist:
# - railway.toml
# - .python-version
# - requirements.txt
# - Procfile

# Redeploy
railway up --detach
```

### Build Fails
- Ensure Python 3.11 is specified in `.python-version`
- Check all dependencies are in `requirements.txt`
- Verify `railway.toml` exists
- Try: `railway logs` to see detailed errors
- Let Railway auto-detect (simpler is better!)

### App Crashes
- Check Railway logs: `railway logs`
- Verify PORT environment variable binding in start command
- Ensure gunicorn is in requirements.txt

### Audio Not Working
- Click anywhere on the page to activate audio
- Check browser audio permissions
- Verify Web Audio API is supported

## 📈 Performance

- Lightweight Flask server
- Static asset caching
- Minimal dependencies
- Fast cold starts on Railway

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

Free and open-source. Enjoy!

---

**Created on September 29, 2025**

**Deployed on Railway** 🚂
