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
DASHBOARD_DOMAIN="dashboard.indicator-app.com"
OPERATE_DOMAIN="operate.indicator-app.com"
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
DASHBOARD_CONFIG="/etc/nginx/sites-available/dashboard"
OPERATE_CONFIG="/etc/nginx/sites-available/operate"

if [ ! -f "$BACKEND_CONFIG" ]; then
    print_error "Backend Nginx configuration not found: $BACKEND_CONFIG"
    print_info "Please run: sudo bash setup-nginx-backend.sh first"
    exit 1
fi

if [ ! -f "$PHPMYADMIN_CONFIG" ]; then
    print_info "phpMyAdmin Nginx configuration not found. It will be created during SSL setup."
fi

if [ ! -f "$DASHBOARD_CONFIG" ]; then
    print_info "Dashboard Nginx configuration not found. It will be created during SSL setup."
fi

if [ ! -f "$OPERATE_CONFIG" ]; then
    print_info "Operate Nginx configuration not found. It will be created during SSL setup."
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
print_info "Make sure all domains point to this server's IP address:"
print_info "  - $BACKEND_DOMAIN"
print_info "  - $PHPMYADMIN_DOMAIN"
print_info "  - $DASHBOARD_DOMAIN"
print_info "  - $OPERATE_DOMAIN"
echo ""
read -p "Have you configured DNS for all domains? (y/n) " -n 1 -r
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

# Setup SSL for dashboard domain
print_info "Setting up SSL certificate for $DASHBOARD_DOMAIN..."

# Check if dashboard config exists, if not create it
if [ ! -f "$DASHBOARD_CONFIG" ]; then
    print_info "Creating Dashboard Nginx configuration..."
    
    # Check if config file exists in current directory
    if [ -f "nginx-dashboard.conf" ]; then
        print_info "Using nginx-dashboard.conf from project directory..."
        cp nginx-dashboard.conf $DASHBOARD_CONFIG
    else
        # Create basic config - you may need to customize this based on your dashboard setup
        print_info "Creating basic dashboard configuration..."
        cat > $DASHBOARD_CONFIG << EOF
server {
    listen 80;
    server_name $DASHBOARD_DOMAIN;
    
    # Increase body size limit for file uploads
    client_max_body_size 10M;
    
    # Proxy to your dashboard application
    # Update this based on where your dashboard is running
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
        print_info "Basic dashboard configuration created. You may need to customize the proxy_pass URL."
    fi
    
    # Enable site
    ln -sf $DASHBOARD_CONFIG /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        print_success "Dashboard Nginx configuration created"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
fi

# Obtain SSL certificate for dashboard
if certbot --nginx -d $DASHBOARD_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect; then
    print_success "SSL certificate obtained for $DASHBOARD_DOMAIN"
else
    print_error "Failed to obtain SSL certificate for $DASHBOARD_DOMAIN"
    print_info "You can retry later with: sudo certbot --nginx -d $DASHBOARD_DOMAIN"
fi

# Setup SSL for operate domain
print_info "Setting up SSL certificate for $OPERATE_DOMAIN..."

# Check if operate config exists and has SSL settings but certificates don't exist
if [ -f "$OPERATE_CONFIG" ] && grep -q "ssl_certificate" "$OPERATE_CONFIG" && [ ! -f "/etc/letsencrypt/live/$OPERATE_DOMAIN/fullchain.pem" ]; then
    print_info "Config exists with SSL settings but certificates not found. Creating HTTP-only version..."
    # Backup existing config
    cp $OPERATE_CONFIG ${OPERATE_CONFIG}.backup
    print_info "Backed up existing config to ${OPERATE_CONFIG}.backup"
    
    # Create HTTP-only version
    cat > $OPERATE_CONFIG << 'EOFTEMP'
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
EOFTEMP
    
    # Test and reload
    if nginx -t; then
        systemctl reload nginx
        print_success "HTTP-only configuration created. Certbot will add SSL automatically."
    else
        print_error "Failed to create valid HTTP-only configuration"
        # Restore backup
        mv ${OPERATE_CONFIG}.backup $OPERATE_CONFIG
        exit 1
    fi
fi

# Check if operate config exists, if not create it
if [ ! -f "$OPERATE_CONFIG" ]; then
    print_info "Creating Operate Nginx configuration..."
    
    # Check if config file exists in current directory
    if [ -f "nginx-operate.conf" ]; then
        print_info "Using nginx-operate.conf from project directory..."
        
        # Check if config has SSL settings but certificates don't exist
        if grep -q "ssl_certificate" "nginx-operate.conf" && [ ! -f "/etc/letsencrypt/live/$OPERATE_DOMAIN/fullchain.pem" ]; then
            print_info "Config has SSL settings but certificates don't exist yet. Creating HTTP-only version for Certbot..."
            
            # Create HTTP-only version by extracting just the HTTP server block or creating a basic one
            # Remove HTTPS server block and SSL redirect, keep only HTTP server
            cat > $OPERATE_CONFIG << 'EOFTEMP'
server {
    listen 80;
    listen [::]:80;
    server_name operate.indicator-app.com www.operate.indicator-app.com;

    # Root directory - serves files from /var/www/horizon-dashboard/dist
    root /var/www/horizon-dashboard/dist;
    index index.html index.htm;

    # Logging
    access_log /var/log/nginx/operate.indicator-app.com-access.log;
    error_log /var/log/nginx/operate.indicator-app.com-error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Main location block - SPA routing support
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Deny access to backup files
    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOFTEMP
            print_info "Created HTTP-only configuration. Certbot will add SSL settings automatically."
        else
            cp nginx-operate.conf $OPERATE_CONFIG
        fi
    else
        # Create basic config - you may need to customize this based on your operate setup
        print_info "Creating basic operate configuration..."
        cat > $OPERATE_CONFIG << EOF
server {
    listen 80;
    server_name $OPERATE_DOMAIN;
    
    # Increase body size limit for file uploads
    client_max_body_size 10M;
    
    # Proxy to your operate application
    # Update this based on where your operate app is running
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
        print_info "Basic operate configuration created. You may need to customize the proxy_pass URL."
    fi
    
    # Enable site
    ln -sf $OPERATE_CONFIG /etc/nginx/sites-enabled/
    
    # Test Nginx configuration before reloading
    print_info "Testing Nginx configuration..."
    if nginx -t; then
        systemctl reload nginx
        print_success "Operate Nginx configuration created and enabled"
    else
        print_error "Nginx configuration test failed"
        print_info "Checking if SSL certificates are missing..."
        
        # If config has SSL but certificates don't exist, create HTTP-only version
        if grep -q "ssl_certificate" $OPERATE_CONFIG && [ ! -f "/etc/letsencrypt/live/$OPERATE_DOMAIN/fullchain.pem" ]; then
            print_info "SSL certificates not found. Creating HTTP-only configuration..."
            cat > $OPERATE_CONFIG << 'EOFTEMP'
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
EOFTEMP
            if nginx -t; then
                systemctl reload nginx
                print_success "HTTP-only configuration created. Certbot will add SSL automatically."
            else
                print_error "Failed to create valid Nginx configuration"
                exit 1
            fi
        else
            print_error "Please check the Nginx configuration manually"
            exit 1
        fi
    fi
fi

# Obtain SSL certificate for operate
if certbot --nginx -d $OPERATE_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect; then
    print_success "SSL certificate obtained for $OPERATE_DOMAIN"
else
    print_error "Failed to obtain SSL certificate for $OPERATE_DOMAIN"
    print_info "You can retry later with: sudo certbot --nginx -d $OPERATE_DOMAIN"
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
echo "  Dashboard: https://$DASHBOARD_DOMAIN/"
echo "  Operate: https://$OPERATE_DOMAIN/"
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

