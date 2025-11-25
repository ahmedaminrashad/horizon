#!/bin/bash

# Quick fix script to replace SSL config with HTTP-only version
# This fixes the error: cannot load certificate when certificates don't exist

set -e

echo "=========================================="
echo "Fixing Operate Nginx Configuration"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
    print_error "Please run this script with sudo"
    exit 1
fi

OPERATE_CONFIG="/etc/nginx/sites-available/operate"
OPERATE_CONFIG_ENABLED="/etc/nginx/sites-enabled/operate.indicator-app.com"

# Check if config exists
if [ ! -f "$OPERATE_CONFIG" ]; then
    print_error "Config file not found: $OPERATE_CONFIG"
    exit 1
fi

# Backup existing config
print_info "Backing up existing configuration..."
cp $OPERATE_CONFIG ${OPERATE_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)
print_success "Backup created"

# Check if we have the HTTP-only template
if [ -f "nginx-operate-http.conf" ]; then
    print_info "Using nginx-operate-http.conf template..."
    cp nginx-operate-http.conf $OPERATE_CONFIG
else
    print_info "Creating HTTP-only configuration..."
    cat > $OPERATE_CONFIG << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name operate.indicator-app.com www.operate.indicator-app.com;

    root /var/www/horizon-dashboard/dist;
    index index.html index.htm;

    access_log /var/log/nginx/operate.indicator-app.com-access.log;
    error_log /var/log/nginx/operate.indicator-app.com-error.log;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
        
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
fi

# Test Nginx configuration
print_info "Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
    
    # Reload Nginx
    print_info "Reloading Nginx..."
    if systemctl reload nginx; then
        print_success "Nginx reloaded successfully"
    else
        print_error "Failed to reload Nginx, trying restart..."
        systemctl restart nginx
        if systemctl is-active --quiet nginx; then
            print_success "Nginx restarted successfully"
        else
            print_error "Failed to restart Nginx"
            exit 1
        fi
    fi
else
    print_error "Nginx configuration test failed"
    print_info "Restoring backup..."
    # Find the most recent backup
    BACKUP_FILE=$(ls -t ${OPERATE_CONFIG}.backup.* 2>/dev/null | head -1)
    if [ -n "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" $OPERATE_CONFIG
        print_info "Backup restored. Please check the configuration manually."
    fi
    exit 1
fi

echo ""
echo "=========================================="
print_success "Configuration Fixed!"
echo "=========================================="
echo ""
print_info "The HTTP-only configuration is now active."
print_info "You can now run the SSL setup script:"
echo "  sudo bash setup-ssl.sh"
echo ""
print_info "Certbot will automatically add SSL settings to this configuration."
echo ""

