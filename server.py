#!/usr/bin/env python3
"""
Simple Flask server for Pong Game
Serves static HTML5 game on Railway
"""

from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def index():
    """Serve the main game page"""
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

@app.route('/health')
def health():
    """Health check endpoint for Railway"""
    return {'status': 'healthy', 'game': 'pong'}, 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
