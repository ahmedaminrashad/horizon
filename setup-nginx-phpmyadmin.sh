#!/bin/bash

# Nginx Configuration Setup for phpMyAdmin (SQL Domain)
# This script sets up Nginx to serve phpMyAdmin at sql.indicator-app.com

set -e  # Exit on any error

echo "=========================================="
echo "Nginx phpMyAdmin Configuration Setup"
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

# Configuration
NGINX_SITE_NAME="phpmyadmin"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
CONFIG_FILE="nginx-phpmyadmin.conf"
DOMAIN="sql.indicator-app.com"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run this script with sudo"
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed"
    read -p "Do you want to install Nginx? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installing Nginx..."
        apt-get update
        apt-get install -y nginx
        print_success "Nginx installed successfully"
    else
        print_error "Cannot proceed without Nginx"
        exit 1
    fi
else
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
    print_success "Nginx is installed: $NGINX_VERSION"
fi

# Check if phpMyAdmin is installed
PMA_DIR="/usr/share/phpmyadmin"
if [ ! -d "$PMA_DIR" ]; then
    print_error "phpMyAdmin is not installed"
    print_info "Please run: sudo bash install-phpmyadmin.sh first"
    exit 1
fi
print_success "phpMyAdmin found at: $PMA_DIR"

# Check if PHP-FPM is installed and running
if ! systemctl is-active --quiet php*-fpm 2>/dev/null; then
    print_info "PHP-FPM is not running. Checking installation..."
    
    # Try to find and start PHP-FPM
    PHP_VERSIONS=("8.3" "8.2" "8.1" "8.0" "7.4")
    PHP_FPM_FOUND=false
    
    for version in "${PHP_VERSIONS[@]}"; do
        if systemctl list-units --type=service | grep -q "php${version}-fpm"; then
            print_info "Starting PHP ${version}-FPM..."
            systemctl start php${version}-fpm
            systemctl enable php${version}-fpm
            PHP_FPM_FOUND=true
            print_success "PHP ${version}-FPM started"
            break
        fi
    done
    
    if [ "$PHP_FPM_FOUND" = false ]; then
        print_error "PHP-FPM is not installed"
        print_info "Installing PHP and PHP-FPM..."
        apt-get update
        apt-get install -y php-fpm php-mysql php-mbstring php-zip php-gd php-json php-curl php-xml
        systemctl start php*-fpm
        systemctl enable php*-fpm
        print_success "PHP-FPM installed and started"
    fi
else
    print_success "PHP-FPM is running"
fi

# Check if config file exists in current directory
if [ ! -f "$CONFIG_FILE" ]; then
    print_error "Configuration file not found: $CONFIG_FILE"
    print_info "Please make sure you're running this script from the project root directory"
    exit 1
fi

# Get server name or IP (optional override)
print_info "Enter your server domain name (press Enter for default: $DOMAIN)"
read -p "Server name: " SERVER_NAME
SERVER_NAME="${SERVER_NAME:-$DOMAIN}"

# Update the config file with server name if different
if [ "$SERVER_NAME" != "$DOMAIN" ]; then
    sed -i "s/server_name $DOMAIN;/server_name $SERVER_NAME;/" "$CONFIG_FILE"
    print_info "Updated server name to: $SERVER_NAME"
fi

# Copy configuration to sites-available
print_info "Copying configuration to Nginx sites-available..."
cp "$CONFIG_FILE" "$NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME"
print_success "Configuration copied to $NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME"

# Create symbolic link to enable site
if [ -L "$NGINX_SITES_ENABLED/$NGINX_SITE_NAME" ]; then
    print_info "Site already enabled, removing old link..."
    rm -f "$NGINX_SITES_ENABLED/$NGINX_SITE_NAME"
fi

print_info "Enabling site..."
ln -s "$NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME" "$NGINX_SITES_ENABLED/$NGINX_SITE_NAME"
print_success "Site enabled"

# Test Nginx configuration
print_info "Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    print_info "Please check the configuration file: $NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME"
    exit 1
fi

# Reload Nginx
print_info "Reloading Nginx..."
if systemctl reload nginx; then
    print_success "Nginx reloaded successfully"
else
    print_error "Failed to reload Nginx"
    print_info "Trying to restart Nginx..."
    systemctl restart nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx restarted successfully"
    else
        print_error "Failed to restart Nginx"
        exit 1
    fi
fi

# Show final status
echo ""
echo "=========================================="
print_success "Nginx phpMyAdmin Configuration Complete"
echo "=========================================="
echo ""
print_info "Configuration Details:"
echo "  Site name: $NGINX_SITE_NAME"
echo "  Server name: $SERVER_NAME"
echo "  phpMyAdmin directory: $PMA_DIR"
echo "  Config file: $NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME"
echo ""
print_info "phpMyAdmin is now accessible at:"
echo "  http://$SERVER_NAME/"
echo ""
print_info "Useful Commands:"
echo "  Test config: sudo nginx -t"
echo "  Reload: sudo systemctl reload nginx"
echo "  Restart: sudo systemctl restart nginx"
echo "  View logs: sudo tail -f /var/log/nginx/phpmyadmin-error.log"
echo "  View access logs: sudo tail -f /var/log/nginx/phpmyadmin-access.log"
echo ""
print_info "Next Steps:"
echo "  1. Set up SSL certificate: sudo bash setup-ssl.sh"
echo "  2. Access phpMyAdmin: http://$SERVER_NAME/"
echo "  3. Login with your MySQL credentials"
echo ""

