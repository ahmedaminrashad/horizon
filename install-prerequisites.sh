#!/bin/bash

# Horizon Backend - Prerequisites Installation Script
# This script installs all required dependencies for running the NestJS application

set -e  # Exit on any error

echo "=========================================="
echo "Horizon Backend - Prerequisites Installer"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root"
    exit 1
fi

# Update system packages
print_info "Updating system packages..."
sudo apt-get update -qq

# Install curl and wget if not present
print_info "Installing essential tools..."
sudo apt-get install -y curl wget git build-essential

# Check and install Node.js
print_info "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js is already installed: $NODE_VERSION"
    
    # Check if version is 18 or higher
    NODE_MAJOR_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
        print_info "Node.js version is less than 18. Installing Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js 20.x installed successfully"
    fi
else
    print_info "Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed successfully"
fi

# Verify Node.js and npm installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
print_success "Node.js: $NODE_VERSION"
print_success "npm: $NPM_VERSION"

# Install PM2 globally for process management
print_info "Installing PM2 process manager..."
if command -v pm2 &> /dev/null; then
    print_success "PM2 is already installed: $(pm2 -v)"
else
    sudo npm install -g pm2
    print_success "PM2 installed successfully"
fi

# Check and install MySQL
print_info "Checking MySQL installation..."
if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version)
    print_success "MySQL is already installed: $MYSQL_VERSION"
else
    print_info "MySQL not found. Installing MySQL Server..."
    sudo apt-get install -y mysql-server
    
    # Start MySQL service
    sudo systemctl start mysql
    sudo systemctl enable mysql
    
    print_success "MySQL installed successfully"
    print_info "Please configure MySQL root password:"
    print_info "Run: sudo mysql_secure_installation"
fi

# Install TypeScript globally (optional but helpful)
print_info "Installing TypeScript globally..."
sudo npm install -g typescript ts-node

# Create application directory structure
print_info "Setting up directory structure..."
APP_DIR="/var/www/horizon-backend"
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
    print_success "Application directory created: $APP_DIR"
else
    print_success "Application directory already exists: $APP_DIR"
fi

# Create logs directory
LOGS_DIR="/var/log/horizon-backend"
if [ ! -d "$LOGS_DIR" ]; then
    sudo mkdir -p $LOGS_DIR
    sudo chown -R $USER:$USER $LOGS_DIR
    print_success "Logs directory created: $LOGS_DIR"
else
    print_success "Logs directory already exists: $LOGS_DIR"
fi

# Install Nginx (optional, for reverse proxy)
print_info "Checking Nginx installation..."
if command -v nginx &> /dev/null; then
    print_success "Nginx is already installed"
else
    read -p "Do you want to install Nginx for reverse proxy? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo apt-get install -y nginx
        print_success "Nginx installed successfully"
    fi
fi

# Install phpMyAdmin (optional)
print_info "Checking phpMyAdmin installation..."
if [ -d "/usr/share/phpmyadmin" ] || [ -d "/var/www/phpmyadmin" ]; then
    print_success "phpMyAdmin is already installed"
else
    read -p "Do you want to install phpMyAdmin? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installing phpMyAdmin..."
        
        # Install PHP and required extensions
        if ! command -v php &> /dev/null; then
            print_info "Installing PHP and required extensions..."
            sudo apt-get install -y php php-mysql php-mbstring php-zip php-gd php-json php-curl
        else
            # Install PHP extensions if PHP is already installed
            sudo apt-get install -y php-mysql php-mbstring php-zip php-gd php-json php-curl
        fi
        
        # Download and install phpMyAdmin
        PMA_VERSION="5.2.1"
        PMA_DIR="/usr/share/phpmyadmin"
        
        print_info "Downloading phpMyAdmin $PMA_VERSION..."
        cd /tmp
        wget -q https://files.phpmyadmin.net/phpMyAdmin/${PMA_VERSION}/phpMyAdmin-${PMA_VERSION}-all-languages.tar.gz
        
        print_info "Extracting phpMyAdmin..."
        sudo tar -xzf phpMyAdmin-${PMA_VERSION}-all-languages.tar.gz
        sudo mv phpMyAdmin-${PMA_VERSION}-all-languages $PMA_DIR
        sudo chown -R www-data:www-data $PMA_DIR
        
        # Create config directory
        sudo mkdir -p $PMA_DIR/config
        sudo chmod 777 $PMA_DIR/config
        
        # Create blowfish secret
        BLOWFISH_SECRET=$(openssl rand -base64 32)
        
        # Copy sample config
        sudo cp $PMA_DIR/config.sample.inc.php $PMA_DIR/config.inc.php
        
        # Configure phpMyAdmin
        sudo sed -i "s/\$cfg\['blowfish_secret'\] = '';/\$cfg['blowfish_secret'] = '$BLOWFISH_SECRET';/" $PMA_DIR/config.inc.php
        
        # Clean up
        rm -f /tmp/phpMyAdmin-${PMA_VERSION}-all-languages.tar.gz
        
        print_success "phpMyAdmin installed successfully"
        print_info "phpMyAdmin location: $PMA_DIR"
        print_info "You need to configure web server (Apache/Nginx) to access phpMyAdmin"
        print_info "Run: sudo bash install-phpmyadmin.sh for web server configuration"
    fi
fi

# Summary
echo ""
echo "=========================================="
print_success "Prerequisites installation completed!"
echo "=========================================="
echo ""
print_info "Next steps:"
echo "  1. Configure MySQL: sudo mysql_secure_installation"
echo "  2. Create database: mysql -u root -p -e 'CREATE DATABASE horizon;'"
echo "  3. Clone your repository to $APP_DIR"
echo "  4. Run the deployment script: ./deploy.sh"
echo ""
print_info "Installed versions:"
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"
echo "  PM2: $(pm2 -v)"
echo "  MySQL: $(mysql --version 2>/dev/null || echo 'Not configured')"
echo ""

