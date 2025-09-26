#!/bin/bash

# Pong Levels Online - Railway Deployment Script
echo "🏓 Deploying Pong Levels Online to Railway..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    print_warning "Not logged in to Railway. Please login first:"
    echo "railway login"
    exit 1
fi

print_status "Checking project structure..."

# Verify required files exist
required_files=(
    "package.json"
    "server.js"
    "public/index.html"
    "migrations/setup.js"
)

for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files present"

# Check if this is a new project or existing
print_status "Checking Railway project status..."

if railway status &> /dev/null; then
    print_warning "Existing Railway project detected. This will update the current deployment."
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
else
    print_status "Creating new Railway project..."
    railway init
fi

# Add PostgreSQL if not present
print_status "Checking for PostgreSQL service..."
if ! railway services | grep -q "postgres"; then
    print_status "Adding PostgreSQL database..."
    railway add --database postgresql
    print_success "PostgreSQL database added"
else
    print_success "PostgreSQL database already present"
fi

# Set environment variables
print_status "Setting environment variables..."

# Generate JWT secret if not set
if ! railway variables get JWT_SECRET &> /dev/null; then
    JWT_SECRET=$(openssl rand -base64 32)
    railway variables set JWT_SECRET="$JWT_SECRET"
    print_success "JWT_SECRET generated and set"
fi

# Set NODE_ENV
railway variables set NODE_ENV="production"
print_success "Environment variables configured"

# Deploy the application
print_status "Deploying application..."
railway up --detach

if [[ $? -eq 0 ]]; then
    print_success "Application deployed successfully!"
else
    print_error "Deployment failed!"
    exit 1
fi

# Wait for deployment to be ready
print_status "Waiting for deployment to be ready..."
sleep 30

# Run database migration
print_status "Running database migration..."
if railway run npm run migrate; then
    print_success "Database migration completed"
else
    print_error "Database migration failed"
    print_warning "You may need to run 'railway run npm run migrate' manually"
fi

# Get the deployment URL
DEPLOY_URL=$(railway domain)

if [[ -n "$DEPLOY_URL" ]]; then
    print_success "🎮 Pong Levels Online is now live!"
    print_success "🌐 URL: https://$DEPLOY_URL"
    print_success "🏆 Visit your game and start playing!"
    
    # Generate demo account info
    echo
    print_status "Demo accounts (password: password123):"
    echo "   • demo_player"
    echo "   • pong_master"
    echo "   • arcade_king"
    
else
    print_warning "Could not retrieve deployment URL. Check Railway dashboard."
fi

print_success "Deployment script completed!"
echo
print_status "Useful commands:"
echo "   • View logs: railway logs"
echo "   • Check status: railway status"  
echo "   • Open dashboard: railway open"
echo "   • Run migration: railway run npm run migrate"