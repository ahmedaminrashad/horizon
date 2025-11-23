#!/bin/bash

# Nginx Status Check and Management Script
# This script checks nginx status and ensures it's running

set -e  # Exit on any error

echo "=========================================="
echo "Nginx Status Check"
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

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed"
    read -p "Do you want to install Nginx? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installing Nginx..."
        sudo apt-get update
        sudo apt-get install -y nginx
        print_success "Nginx installed successfully"
    else
        print_error "Cannot proceed without Nginx"
        exit 1
    fi
else
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
    print_success "Nginx is installed: $NGINX_VERSION"
fi

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
    NGINX_RUNNING=true
else
    print_error "Nginx is not running"
    NGINX_RUNNING=false
fi

# Check nginx status
echo ""
print_info "Nginx Service Status:"
systemctl status nginx --no-pager -l || true

# Check nginx configuration
echo ""
print_info "Checking Nginx configuration..."
if sudo nginx -t 2>&1; then
    print_success "Nginx configuration is valid"
    CONFIG_VALID=true
else
    print_error "Nginx configuration has errors"
    CONFIG_VALID=false
fi

# Show nginx processes
echo ""
print_info "Nginx Processes:"
ps aux | grep nginx | grep -v grep || print_info "No nginx processes found"

# Show listening ports
echo ""
print_info "Nginx Listening Ports:"
sudo netstat -tulpn | grep nginx || sudo ss -tulpn | grep nginx || print_info "No nginx ports found"

# Show enabled sites
echo ""
print_info "Enabled Nginx Sites:"
if [ -d "/etc/nginx/sites-enabled" ]; then
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null || print_info "No enabled sites found"
else
    print_info "sites-enabled directory not found"
fi

# Show nginx error log (last 10 lines)
echo ""
print_info "Recent Nginx Error Log (last 10 lines):"
if [ -f "/var/log/nginx/error.log" ]; then
    sudo tail -n 10 /var/log/nginx/error.log
else
    print_info "Error log not found"
fi

# Start nginx if not running
if [ "$NGINX_RUNNING" = false ]; then
    echo ""
    print_info "Attempting to start Nginx..."
    
    if [ "$CONFIG_VALID" = false ]; then
        print_error "Cannot start Nginx: configuration has errors"
        print_info "Please fix configuration errors first"
        exit 1
    fi
    
    sudo systemctl start nginx
    
    # Wait a moment and check again
    sleep 2
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx started successfully"
    else
        print_error "Failed to start Nginx"
        print_info "Check logs: sudo journalctl -u nginx -n 50"
        exit 1
    fi
fi

# Enable nginx to start on boot
if ! systemctl is-enabled --quiet nginx 2>/dev/null; then
    echo ""
    print_info "Enabling Nginx to start on boot..."
    sudo systemctl enable nginx
    print_success "Nginx enabled to start on boot"
fi

# Show final status
echo ""
echo "=========================================="
print_success "Nginx Status Check Complete"
echo "=========================================="
echo ""
print_info "Nginx Status:"
systemctl is-active nginx && print_success "Running" || print_error "Not Running"
systemctl is-enabled nginx && print_success "Enabled on boot" || print_info "Not enabled on boot"
echo ""
print_info "Useful Commands:"
echo "  Check status: sudo systemctl status nginx"
echo "  Start: sudo systemctl start nginx"
echo "  Stop: sudo systemctl stop nginx"
echo "  Restart: sudo systemctl restart nginx"
echo "  Reload: sudo systemctl reload nginx"
echo "  Test config: sudo nginx -t"
echo "  View logs: sudo tail -f /var/log/nginx/error.log"
echo ""

