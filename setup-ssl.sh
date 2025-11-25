#!/bin/bash

# SSL Certificate Setup Script for Horizon Backend
# This script sets up Let's Encrypt SSL certificates for backend and phpMyAdmin domains

set -e  # Exit on any error

echo "=========================================="
echo "SSL Certificate Setup"
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
if [ "$EUID" -ne 0 ]; then 
    print_error "This script must be run as root or with sudo"
    print_info "Please run: sudo bash setup-ssl.sh"
    exit 1
fi

# Configuration
BACKEND_DOMAIN="backend.indicator-app.com"
PHPMYADMIN_DOMAIN="sql.indicator-app.com"
EMAIL="${SSL_EMAIL:-}"

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed"
    print_info "Please install Nginx first using: sudo bash setup-nginx-backend.sh"
    exit 1
fi

print_success "Nginx is installed"

# Check if domains are configured in Nginx
print_info "Checking Nginx configurations..."

BACKEND_CONFIG="/etc/nginx/sites-available/horizon-backend"
PHPMYADMIN_CONFIG="/etc/nginx/sites-available/phpmyadmin"

if [ ! -f "$BACKEND_CONFIG" ]; then
    print_error "Backend Nginx configuration not found: $BACKEND_CONFIG"
    print_info "Please run: sudo bash setup-nginx-backend.sh first"
    exit 1
fi

if [ ! -f "$PHPMYADMIN_CONFIG" ]; then
    print_info "phpMyAdmin Nginx configuration not found. It will be created during SSL setup."
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    CERTBOT_VERSION=$(certbot --version)
    print_success "Certbot is installed: $CERTBOT_VERSION"
fi

# Get email for Let's Encrypt notifications
if [ -z "$EMAIL" ]; then
    print_info "Let's Encrypt requires an email address for certificate expiration notifications"
    read -p "Enter your email address: " EMAIL
    if [ -z "$EMAIL" ]; then
        print_error "Email address is required"
        exit 1
    fi
fi

# Check if domains are accessible
print_info "Verifying domain accessibility..."
print_info "Make sure both domains point to this server's IP address:"
print_info "  - $BACKEND_DOMAIN"
print_info "  - $PHPMYADMIN_DOMAIN"
echo ""
read -p "Have you configured DNS for both domains? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please configure DNS first, then run this script again"
    exit 1
fi

# Setup SSL for backend domain
print_info "Setting up SSL certificate for $BACKEND_DOMAIN..."
if certbot --nginx -d $BACKEND_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect; then
    print_success "SSL certificate obtained for $BACKEND_DOMAIN"
else
    print_error "Failed to obtain SSL certificate for $BACKEND_DOMAIN"
    print_info "Make sure:"
    print_info "  1. Domain DNS is pointing to this server"
    print_info "  2. Port 80 and 443 are open in firewall"
    print_info "  3. Nginx is running and accessible"
    exit 1
fi

# Setup SSL for phpMyAdmin domain
print_info "Setting up SSL certificate for $PHPMYADMIN_DOMAIN..."

# Check if phpMyAdmin config exists, if not create it
if [ ! -f "$PHPMYADMIN_CONFIG" ]; then
    print_info "Creating phpMyAdmin Nginx configuration..."
    
    # Check if config file exists in current directory
    if [ -f "nginx-phpmyadmin.conf" ]; then
        print_info "Using nginx-phpmyadmin.conf from project directory..."
        cp nginx-phpmyadmin.conf $PHPMYADMIN_CONFIG
    else
        # Create basic config
        cat > $PHPMYADMIN_CONFIG << EOF
server {
    listen 80;
    server_name $PHPMYADMIN_DOMAIN;
    
    root /usr/share/phpmyadmin;
    index index.php index.html index.htm;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
    
    location ~ \.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.ht {
        deny all;
    }
}
EOF
    fi
    
    # Enable site
    ln -sf $PHPMYADMIN_CONFIG /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        print_success "phpMyAdmin Nginx configuration created"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
fi

# Obtain SSL certificate for phpMyAdmin
if certbot --nginx -d $PHPMYADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect; then
    print_success "SSL certificate obtained for $PHPMYADMIN_DOMAIN"
else
    print_error "Failed to obtain SSL certificate for $PHPMYADMIN_DOMAIN"
    print_info "You can retry later with: sudo certbot --nginx -d $PHPMYADMIN_DOMAIN"
fi

# Test certificate renewal
print_info "Testing certificate renewal..."
if certbot renew --dry-run; then
    print_success "Certificate auto-renewal is working"
else
    print_error "Certificate auto-renewal test failed"
    print_info "Check Certbot logs: sudo tail -f /var/log/letsencrypt/letsencrypt.log"
fi

# Verify SSL certificates
echo ""
echo "=========================================="
print_success "SSL Setup Complete"
echo "=========================================="
echo ""
print_info "Certificate Status:"
certbot certificates
echo ""
print_info "Access URLs:"
echo "  Backend API: https://$BACKEND_DOMAIN/api"
echo "  Backend Swagger: https://$BACKEND_DOMAIN/api"
echo "  phpMyAdmin: https://$PHPMYADMIN_DOMAIN/"
echo ""
print_info "Certificate Management:"
echo "  View certificates: sudo certbot certificates"
echo "  Renew certificates: sudo certbot renew"
echo "  Test renewal: sudo certbot renew --dry-run"
echo "  Revoke certificate: sudo certbot revoke --cert-path /etc/letsencrypt/live/DOMAIN/cert.pem"
echo ""
print_info "Auto-renewal:"
echo "  Certbot automatically sets up renewal via systemd timer"
echo "  Check status: sudo systemctl status certbot.timer"
echo "  View logs: sudo journalctl -u certbot.timer"
echo ""
print_info "Security Notes:"
echo "  - Certificates auto-renew 30 days before expiration"
echo "  - Keep port 80 open for ACME challenge validation"
echo "  - Monitor certificate expiration: sudo certbot certificates"
echo ""

