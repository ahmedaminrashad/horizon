#!/bin/bash

# Nginx Configuration Setup for Horizon Backend
# This script sets up Nginx to proxy /backend to the backend service

set -e  # Exit on any error

echo "=========================================="
echo "Nginx Backend Configuration Setup"
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
NGINX_SITE_NAME="horizon-backend"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
CONFIG_FILE="nginx-horizon-backend.conf"
BACKEND_PORT="${BACKEND_PORT:-3000}"

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

# Check if config file exists in current directory
if [ ! -f "$CONFIG_FILE" ]; then
    print_error "Configuration file not found: $CONFIG_FILE"
    print_info "Please make sure you're running this script from the project root directory"
    exit 1
fi

# Get server name or IP
print_info "Enter your server domain name or IP address (press Enter for default: _)"
read -p "Server name/IP: " SERVER_NAME
SERVER_NAME="${SERVER_NAME:-_}"

# Update the config file with server name
sed -i "s/server_name _;/server_name $SERVER_NAME;/" "$CONFIG_FILE"

# Update backend port if different
if [ "$BACKEND_PORT" != "3000" ]; then
    sed -i "s/localhost:3000/localhost:$BACKEND_PORT/" "$CONFIG_FILE"
    print_info "Updated backend port to $BACKEND_PORT"
fi

# Copy configuration to sites-available
print_info "Copying configuration to Nginx sites-available..."
cp "$CONFIG_FILE" "$NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME"
print_success "Configuration copied to $NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME"

# Remove default site if it exists
if [ -f "$NGINX_SITES_ENABLED/default" ]; then
    print_info "Removing default Nginx site..."
    rm -f "$NGINX_SITES_ENABLED/default"
    print_success "Default site removed"
fi

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
print_success "Nginx Configuration Complete"
echo "=========================================="
echo ""
print_info "Configuration Details:"
echo "  Site name: $NGINX_SITE_NAME"
echo "  Server name: $SERVER_NAME"
echo "  Backend port: $BACKEND_PORT"
echo "  Config file: $NGINX_SITES_AVAILABLE/$NGINX_SITE_NAME"
echo ""
print_info "Your backend is now accessible at:"
echo "  http://$SERVER_NAME/backend"
echo "  http://$SERVER_NAME/backend/api (Swagger documentation)"
echo ""
print_info "Useful Commands:"
echo "  Test config: sudo nginx -t"
echo "  Reload: sudo systemctl reload nginx"
echo "  Restart: sudo systemctl restart nginx"
echo "  View logs: sudo tail -f /var/log/nginx/error.log"
echo "  View access logs: sudo tail -f /var/log/nginx/access.log"
echo ""

