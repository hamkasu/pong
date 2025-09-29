# Pong Game - HTML5/JavaScript

## Overview
This is a classic Pong game implementation using Flask backend serving an HTML5/JavaScript frontend. The game features both single-player (vs AI) and local multiplayer modes, with audio controls and a leaderboard system.

## Project Architecture
- **Backend**: Flask (Python 3.11) serving static files and templates
- **Frontend**: HTML5 Canvas with JavaScript game logic
- **Audio**: Web Audio API for sound effects and music
- **Styling**: CSS with retro green terminal aesthetic

## Current State
- ✅ Python 3.11 environment configured
- ✅ Flask dependencies installed (Flask 3.0.0, gunicorn 21.2.0)
- ✅ Server configured for port 5000 with proper host settings
- ✅ Workflow configured and running successfully
- ✅ Deployment configuration set up with gunicorn
- ✅ Application tested and fully functional

## Features
- Single player vs AI mode
- Local multiplayer mode
- Audio controls (music and SFX)
- Leaderboard system with local storage
- Responsive canvas-based gameplay
- Retro styling with green terminal theme

## Technical Details
- Server runs on port 5000 (configured for Replit environment)
- Uses Flask development server for local development
- Production deployment uses gunicorn with autoscale
- All static assets served through Flask routes
- Game state managed entirely in frontend JavaScript

## Recent Changes (2025-09-29)
- Imported from GitHub repository
- Updated server.py to use port 5000 instead of 3000
- Configured Flask workflow for Replit environment
- Set up deployment configuration with gunicorn
- Verified application functionality through testing

## File Structure
```
.
├── server.py              # Flask application server
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Main game HTML template
├── static/
│   ├── css/
│   │   └── style.css     # Game styling
│   └── js/
│       └── game.js       # Game logic and controls
└── replit.md             # This documentation file
```