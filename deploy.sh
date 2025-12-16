#!/bin/bash

# Horizon Backend - Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "=========================================="
echo "Horizon Backend - Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="horizon-backend"

# App Directory Configuration
# Default: /var/www/horizon-backend
# You can override by setting APP_DIR environment variable:
#   export APP_DIR=/path/to/your/app
#   ./deploy.sh
# Or use current directory:
#   APP_DIR=$(pwd) ./deploy.sh
APP_DIR="${APP_DIR:-/var/www/horizon-backend}"
LOG_DIR="/var/log/horizon-backend"
NODE_ENV="${NODE_ENV:-production}"
PORT="${PORT:-3000}"

# Display configuration
echo "Configuration:"
echo "  App Directory: $APP_DIR"
echo "  Log Directory: $LOG_DIR"
echo "  Environment: $NODE_ENV"
echo "  Port: $PORT"
echo ""

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if required commands exist
check_requirements() {
    print_info "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please run install-prerequisites.sh first"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please run install-prerequisites.sh first"
        exit 1
    fi
    
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Please run install-prerequisites.sh first"
        exit 1
    fi
    
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL is not installed. Please run install-prerequisites.sh first"
        exit 1
    fi
    
    print_success "All requirements met"
}

# Create directories if they don't exist
setup_directories() {
    print_info "Setting up directories..."
    
    # Check if APP_DIR is current directory or user's home directory (no sudo needed)
    NEED_SUDO=true
    if [[ "$APP_DIR" == "$(pwd)" ]] || [[ "$APP_DIR" == "$HOME"* ]]; then
        NEED_SUDO=false
    fi
    
    if [ ! -d "$APP_DIR" ]; then
        if [ "$NEED_SUDO" = true ]; then
            sudo mkdir -p $APP_DIR
            sudo chown -R $USER:$USER $APP_DIR
        else
            mkdir -p $APP_DIR
        fi
        print_success "Created application directory: $APP_DIR"
    else
        print_success "Application directory exists: $APP_DIR"
    fi
    
    if [ ! -d "$LOG_DIR" ]; then
        sudo mkdir -p $LOG_DIR
        sudo chown -R $USER:$USER $LOG_DIR
        print_success "Created logs directory: $LOG_DIR"
    else
        print_success "Logs directory exists: $LOG_DIR"
    fi
}

# Backup current deployment
backup_current() {
    if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
        print_info "Creating backup..."
        BACKUP_DIR="${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        sudo cp -r $APP_DIR $BACKUP_DIR
        print_success "Backup created: $BACKUP_DIR"
    fi
}

# Pull latest code (if using git)
pull_code() {
    if [ -d "$APP_DIR/.git" ]; then
        print_info "Pulling latest code from repository..."
        cd $APP_DIR
        git fetch origin
        git reset --hard origin/main || git reset --hard origin/master
        print_success "Code updated successfully"
    else
        print_info "Not a git repository. Skipping git pull."
        print_info "Make sure your code is in: $APP_DIR"
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    cd $APP_DIR
    
    # Remove node_modules if exists for clean install
    if [ -d "node_modules" ]; then
        print_info "Removing old node_modules..."
        rm -rf node_modules
    fi
    
    npm ci --production=false
    print_success "Dependencies installed"
}

# Build application
build_application() {
    print_info "Building application..."
    cd $APP_DIR
    
    npm run build
    print_success "Application built successfully"
}

# Check .env file
check_env_file() {
    print_info "Checking environment configuration..."
    cd $APP_DIR
    print_info "Current directory: $APP_DIR"
    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        print_info "Creating .env file from template..."
        
        cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Tga.org@1
DB_DATABASE=horizon

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# Application Configuration
NODE_ENV=production
PORT=3000
EOF
        
        print_info ".env file created. Please update it with your actual values!"
        read -p "Press Enter after updating .env file to continue..."
    else
        print_success ".env file exists"
    fi
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    cd $APP_DIR
    npm run migration:run:clinic:all
    # Run migrations automatically without confirmation
    npm run migration:run

    print_success "Migrations completed"
}

# Seed database
seed_database() {
    print_info "Seeding database..."
    cd $APP_DIR
    
    # Run seed automatically without confirmation
    npm run seed
    print_success "Database seeded"
}

# Stop existing PM2 process
stop_pm2() {
    print_info "Stopping existing PM2 process..."
    cd $APP_DIR
    
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 stop $APP_NAME || true
        pm2 delete $APP_NAME || true
        print_success "Stopped existing process"
    else
        print_info "No existing PM2 process found"
    fi
}

# Start application with PM2
start_application() {
    print_info "Starting application with PM2..."
    cd $APP_DIR
    
    # Create PM2 ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: '$NODE_ENV',
      PORT: $PORT
    },
    error_file: '$LOG_DIR/error.log',
    out_file: '$LOG_DIR/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF
        print_success "Created PM2 ecosystem file"
    fi
    
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    print_success "Application started with PM2"
}

# Show application status
show_status() {
    echo ""
    echo "=========================================="
    print_success "Deployment completed!"
    echo "=========================================="
    echo ""
    print_info "Application Status:"
    pm2 status $APP_NAME
    echo ""
    print_info "Application Logs:"
    echo "  View logs: pm2 logs $APP_NAME"
    echo "  View error logs: pm2 logs $APP_NAME --err"
    echo ""
    print_info "PM2 Commands:"
    echo "  Restart: pm2 restart $APP_NAME"
    echo "  Stop: pm2 stop $APP_NAME"
    echo "  Status: pm2 status"
    echo ""
    print_info "Application should be running on port $PORT"
    echo ""
}

# Main deployment flow
main() {
    check_requirements
    setup_directories
    # backup_current  # Backup disabled
    pull_code
    install_dependencies
    build_application
    check_env_file
    run_migrations
    seed_database
    stop_pm2
    start_application
    show_status
}

# Run main function
main

