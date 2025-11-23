#!/bin/bash

# phpMyAdmin Installation and Configuration Script
# This script installs and configures phpMyAdmin with web server integration

set -e  # Exit on any error

echo "=========================================="
echo "phpMyAdmin Installation & Configuration"
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
    print_info "Please run: sudo bash install-phpmyadmin.sh"
    exit 1
fi

# Check if phpMyAdmin is installed
PMA_DIR="/usr/share/phpmyadmin"
if [ ! -d "$PMA_DIR" ]; then
    print_error "phpMyAdmin is not installed"
    print_info "Please run install-prerequisites.sh first or install phpMyAdmin manually"
    exit 1
fi

print_success "phpMyAdmin found at: $PMA_DIR"

# Detect web server
WEB_SERVER=""
if command -v apache2 &> /dev/null; then
    WEB_SERVER="apache"
    print_success "Apache detected"
elif command -v nginx &> /dev/null; then
    WEB_SERVER="nginx"
    print_success "Nginx detected"
else
    print_error "No web server (Apache/Nginx) found"
    read -p "Do you want to install Apache? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apt-get update
        apt-get install -y apache2 libapache2-mod-php
        WEB_SERVER="apache"
        systemctl start apache2
        systemctl enable apache2
        print_success "Apache installed and started"
    else
        print_error "Cannot proceed without a web server"
        exit 1
    fi
fi

# Install PHP and extensions if not installed
if ! command -v php &> /dev/null; then
    print_info "Installing PHP and required extensions..."
    apt-get install -y php php-mysql php-mbstring php-zip php-gd php-json php-curl php-xml
    print_success "PHP installed"
else
    # Install missing PHP extensions
    print_info "Installing PHP extensions..."
    apt-get install -y php-mysql php-mbstring php-zip php-gd php-json php-curl php-xml 2>/dev/null || true
fi

# Enable mbstring extension
if [ "$WEB_SERVER" = "apache" ]; then
    phpenmod mbstring
fi

# Configure phpMyAdmin
print_info "Configuring phpMyAdmin..."

# Generate blowfish secret if not set
if ! grep -q "blowfish_secret" $PMA_DIR/config.inc.php || grep -q "blowfish_secret.*''" $PMA_DIR/config.inc.php; then
    BLOWFISH_SECRET=$(openssl rand -base64 32)
    if grep -q "blowfish_secret" $PMA_DIR/config.inc.php; then
        sed -i "s/\$cfg\['blowfish_secret'\] = '';/\$cfg['blowfish_secret'] = '$BLOWFISH_SECRET';/" $PMA_DIR/config.inc.php
    else
        echo "\$cfg['blowfish_secret'] = '$BLOWFISH_SECRET';" >> $PMA_DIR/config.inc.php
    fi
    print_success "Blowfish secret configured"
fi

# Configure Apache
if [ "$WEB_SERVER" = "apache" ]; then
    print_info "Configuring Apache..."
    
    # Create Apache configuration
    APACHE_CONF="/etc/apache2/conf-available/phpmyadmin.conf"
    cat > $APACHE_CONF << 'EOF'
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
    
    # Enable configuration
    a2enconf phpmyadmin
    systemctl reload apache2
    
    print_success "Apache configured for phpMyAdmin"
    print_info "phpMyAdmin will be available at: http://your-server-ip/phpmyadmin"
fi

# Configure Nginx
if [ "$WEB_SERVER" = "nginx" ]; then
    print_info "Configuring Nginx..."
    
    # Create Nginx configuration
    NGINX_CONF="/etc/nginx/sites-available/phpmyadmin"
    cat > $NGINX_CONF << 'EOF'
server {
    listen 80;
    server_name _;
    
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
    
    # Enable site
    ln -sf /etc/nginx/sites-available/phpmyadmin /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Nginx configured for phpMyAdmin"
        print_info "phpMyAdmin will be available at: http://your-server-ip/"
    else
        print_error "Nginx configuration test failed"
        rm -f /etc/nginx/sites-enabled/phpmyadmin
        exit 1
    fi
fi

# Set proper permissions
print_info "Setting permissions..."
chown -R www-data:www-data $PMA_DIR
chmod -R 755 $PMA_DIR
chmod 777 $PMA_DIR/config 2>/dev/null || true

# Security: Remove setup directory (optional)
read -p "Do you want to remove the setup directory for security? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "$PMA_DIR/setup" ]; then
        rm -rf $PMA_DIR/setup
        print_success "Setup directory removed"
    fi
fi

# Create .htaccess for additional security (Apache only)
if [ "$WEB_SERVER" = "apache" ] && [ ! -f "$PMA_DIR/.htaccess" ]; then
    read -p "Do you want to add .htaccess password protection? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setting up .htaccess password protection..."
        
        # Install apache2-utils if not installed
        apt-get install -y apache2-utils
        
        # Create .htpasswd file
        HTACCESS_USER="phpmyadmin"
        print_info "Creating password for user: $HTACCESS_USER"
        htpasswd -c $PMA_DIR/.htpasswd $HTACCESS_USER
        
        # Create .htaccess
        cat > $PMA_DIR/.htaccess << 'EOF'
AuthType Basic
AuthName "phpMyAdmin Access"
AuthUserFile /usr/share/phpmyadmin/.htpasswd
Require valid-user
EOF
        
        print_success ".htaccess password protection configured"
        print_info "Username: $HTACCESS_USER"
        print_info "Password: (the one you just entered)"
    fi
fi

# Summary
echo ""
echo "=========================================="
print_success "phpMyAdmin installation completed!"
echo "=========================================="
echo ""
print_info "Access Information:"
if [ "$WEB_SERVER" = "apache" ]; then
    echo "  URL: http://your-server-ip/phpmyadmin"
elif [ "$WEB_SERVER" = "nginx" ]; then
    echo "  URL: http://your-server-ip/"
fi
echo ""
print_info "MySQL Login:"
echo "  Use your MySQL root credentials or any MySQL user"
echo ""
print_info "Security Notes:"
echo "  - Change default MySQL root password if not already done"
echo "  - Consider restricting phpMyAdmin access by IP in web server config"
echo "  - Use HTTPS in production (SSL certificate)"
echo "  - Regularly update phpMyAdmin"
echo ""
print_info "To update phpMyAdmin later:"
echo "  1. Download latest version from https://www.phpmyadmin.net/downloads/"
echo "  2. Extract to $PMA_DIR"
echo "  3. Restore your config.inc.php"
echo ""

