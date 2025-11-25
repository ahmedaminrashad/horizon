#!/bin/bash

# phpMyAdmin 404 Fix Script
# This script diagnoses and fixes phpMyAdmin access issues

set -e  # Exit on any error

echo "=========================================="
echo "phpMyAdmin 404 Fix"
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
    print_info "Please run: sudo bash fix-phpmyadmin.sh"
    exit 1
fi

# Check if phpMyAdmin is installed
PMA_DIR="/usr/share/phpmyadmin"
if [ ! -d "$PMA_DIR" ]; then
    print_error "phpMyAdmin is not installed"
    print_info "Please run: sudo bash install-phpmyadmin.sh"
    exit 1
fi

print_success "phpMyAdmin found at: $PMA_DIR"

# Detect web server
WEB_SERVER=""
if systemctl is-active --quiet apache2; then
    WEB_SERVER="apache"
    print_success "Apache is running"
elif systemctl is-active --quiet nginx; then
    WEB_SERVER="nginx"
    print_success "Nginx is running"
else
    print_error "No web server is running"
    read -p "Do you want to start Apache? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v apache2 &> /dev/null; then
            systemctl start apache2
            WEB_SERVER="apache"
        elif command -v nginx &> /dev/null; then
            systemctl start nginx
            WEB_SERVER="nginx"
        else
            print_error "No web server installed"
            exit 1
        fi
    else
        exit 1
    fi
fi

# Check Apache configuration
if [ "$WEB_SERVER" = "apache" ]; then
    print_info "Checking Apache configuration..."
    
    # Check if phpMyAdmin config exists
    if [ -f "/etc/apache2/conf-available/phpmyadmin.conf" ]; then
        print_success "phpMyAdmin Apache config exists"
    else
        print_info "Creating Apache configuration..."
        cat > /etc/apache2/conf-available/phpmyadmin.conf << 'EOF'
# phpMyAdmin Apache Configuration
Alias /phpmyadmin /usr/share/phpmyadmin

<Directory /usr/share/phpmyadmin>
    Options SymLinksIfOwnerMatch
    DirectoryIndex index.php
    AllowOverride All
    Require all granted
</Directory>

# Disable web server directory listing
<Directory /usr/share/phpmyadmin/libraries>
    Require all denied
</Directory>
<Directory /usr/share/phpmyadmin/setup/lib>
    Require all denied
</Directory>
EOF
        print_success "Apache configuration created"
    fi
    
    # Enable configuration
    if [ ! -f "/etc/apache2/conf-enabled/phpmyadmin.conf" ]; then
        print_info "Enabling phpMyAdmin configuration..."
        a2enconf phpmyadmin
        print_success "Configuration enabled"
    else
        print_success "Configuration already enabled"
    fi
    
    # Check if mod_rewrite is enabled
    if ! apache2ctl -M 2>/dev/null | grep -q rewrite_module; then
        print_info "Enabling mod_rewrite..."
        a2enmod rewrite
    fi
    
    # Test Apache configuration
    print_info "Testing Apache configuration..."
    if apache2ctl configtest; then
        print_success "Apache configuration is valid"
        systemctl reload apache2
        print_success "Apache reloaded"
    else
        print_error "Apache configuration has errors"
        exit 1
    fi
    
    print_success "phpMyAdmin should be accessible at: http://sql.indicator-app.com/phpmyadmin"
fi

# Check Nginx configuration
if [ "$WEB_SERVER" = "nginx" ]; then
    print_info "Checking Nginx configuration..."
    
    # Check if phpMyAdmin site exists
    if [ -f "/etc/nginx/sites-available/phpmyadmin" ]; then
        print_success "phpMyAdmin Nginx config exists"
        
        # Check if it's enabled
        if [ -L "/etc/nginx/sites-enabled/phpmyadmin" ]; then
            print_success "phpMyAdmin site is enabled"
        else
            print_info "Enabling phpMyAdmin site..."
            ln -sf /etc/nginx/sites-available/phpmyadmin /etc/nginx/sites-enabled/
            print_success "Site enabled"
        fi
    else
        print_info "Creating Nginx configuration..."
        cat > /etc/nginx/sites-available/phpmyadmin << 'EOF'
server {
    listen 80;
    server_name sql.indicator-app.com;
    
    root /usr/share/phpmyadmin;
    index index.php index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.ht {
        deny all;
    }
}
EOF
        ln -sf /etc/nginx/sites-available/phpmyadmin /etc/nginx/sites-enabled/
        print_success "Nginx configuration created and enabled"
    fi
    
    # Check PHP-FPM
    if ! systemctl is-active --quiet php*-fpm 2>/dev/null; then
        print_info "Starting PHP-FPM..."
        systemctl start php8.1-fpm 2>/dev/null || systemctl start php8.0-fpm 2>/dev/null || systemctl start php7.4-fpm 2>/dev/null || print_error "PHP-FPM not found"
    fi
    
    # Test Nginx configuration
    print_info "Testing Nginx configuration..."
    if nginx -t; then
        print_success "Nginx configuration is valid"
        systemctl reload nginx
        print_success "Nginx reloaded"
    else
        print_error "Nginx configuration has errors"
        exit 1
    fi
    
    print_success "phpMyAdmin should be accessible at: http://sql.indicator-app.com/"
fi

# Check PHP installation
print_info "Checking PHP installation..."
if command -v php &> /dev/null; then
    PHP_VERSION=$(php -v | head -n 1)
    print_success "PHP installed: $PHP_VERSION"
    
    # Check required extensions
    REQUIRED_EXTENSIONS=("mysql" "mbstring" "zip" "gd" "json" "curl" "xml")
    for ext in "${REQUIRED_EXTENSIONS[@]}"; do
        if php -m | grep -q "^$ext$"; then
            print_success "PHP extension '$ext' is installed"
        else
            print_info "Installing PHP extension '$ext'..."
            apt-get install -y php-${ext} 2>/dev/null || true
        fi
    done
else
    print_error "PHP is not installed"
    print_info "Installing PHP..."
    apt-get update
    apt-get install -y php php-mysql php-mbstring php-zip php-gd php-json php-curl php-xml
    if [ "$WEB_SERVER" = "apache" ]; then
        apt-get install -y libapache2-mod-php
    fi
    print_success "PHP installed"
fi

# Set proper permissions
print_info "Setting permissions..."
chown -R www-data:www-data $PMA_DIR
chmod -R 755 $PMA_DIR

# Check if config.inc.php exists
if [ ! -f "$PMA_DIR/config.inc.php" ]; then
    print_info "Creating config.inc.php..."
    cp $PMA_DIR/config.sample.inc.php $PMA_DIR/config.inc.php
    
    # Generate blowfish secret
    BLOWFISH_SECRET=$(openssl rand -base64 32)
    sed -i "s/\$cfg\['blowfish_secret'\] = '';/\$cfg['blowfish_secret'] = '$BLOWFISH_SECRET';/" $PMA_DIR/config.inc.php
    print_success "config.inc.php created"
fi

# Summary
echo ""
echo "=========================================="
print_success "phpMyAdmin Fix Complete"
echo "=========================================="
echo ""
print_info "Access Information:"
if [ "$WEB_SERVER" = "apache" ]; then
    echo "  URL: http://sql.indicator-app.com/phpmyadmin"
    echo "  Or: http://localhost/phpmyadmin"
elif [ "$WEB_SERVER" = "nginx" ]; then
    echo "  URL: http://sql.indicator-app.com/"
    echo "  Or: http://localhost/"
fi
echo ""
print_info "If you still get 404:"
echo "  1. Check web server is running: sudo systemctl status $WEB_SERVER"
echo "  2. Check firewall: sudo ufw status"
echo "  3. Check web server logs:"
if [ "$WEB_SERVER" = "apache" ]; then
    echo "     sudo tail -f /var/log/apache2/error.log"
else
    echo "     sudo tail -f /var/log/nginx/error.log"
fi
echo "  4. Verify phpMyAdmin directory: ls -la $PMA_DIR"
echo ""

