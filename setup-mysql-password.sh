#!/bin/bash

# MySQL Root Password Setup Script
# This script helps set or reset MySQL root password

set -e  # Exit on any error

echo "=========================================="
echo "MySQL Root Password Setup"
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

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    print_error "MySQL is not installed"
    print_info "Please install MySQL first: sudo apt-get install mysql-server"
    exit 1
fi

# Check if MySQL is running
if ! systemctl is-active --quiet mysql; then
    print_info "Starting MySQL service..."
    sudo systemctl start mysql
    sleep 2
fi

print_success "MySQL is running"

# Try to connect without password
print_info "Checking current MySQL root access..."

if mysql -u root -e "SELECT 1" &>/dev/null; then
    print_success "Can connect to MySQL as root (no password or auth_socket)"
    HAS_PASSWORD=false
elif mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1" &>/dev/null 2>/dev/null; then
    print_success "MySQL root password is already set"
    HAS_PASSWORD=true
else
    print_info "Cannot connect. Password may be required or MySQL needs configuration."
    HAS_PASSWORD=unknown
fi

# Prompt for password
echo ""
read -sp "Enter new MySQL root password: " NEW_PASSWORD
echo ""
read -sp "Confirm MySQL root password: " CONFIRM_PASSWORD
echo ""

if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
    print_error "Passwords do not match!"
    exit 1
fi

if [ -z "$NEW_PASSWORD" ]; then
    print_error "Password cannot be empty!"
    exit 1
fi

# Set password
print_info "Setting MySQL root password..."

if [ "$HAS_PASSWORD" = "false" ]; then
    # No password set, use sudo mysql
    sudo mysql -u root << EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$NEW_PASSWORD';
FLUSH PRIVILEGES;
EOF
else
    # Password might be set, try to set new one
    # First try without password
    if mysql -u root << EOF 2>/dev/null
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$NEW_PASSWORD';
FLUSH PRIVILEGES;
EOF
    then
        print_success "Password set successfully"
    else
        print_error "Failed to set password. You may need to reset it manually."
        print_info "See DEPLOYMENT.md for password reset instructions"
        exit 1
    fi
fi

# Test new password
print_info "Testing new password..."
if mysql -u root -p"$NEW_PASSWORD" -e "SELECT 1" &>/dev/null; then
    print_success "Password set and verified successfully!"
else
    print_error "Password verification failed"
    exit 1
fi

# Create database if it doesn't exist
read -p "Do you want to create the 'horizon' database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Creating horizon database..."
    mysql -u root -p"$NEW_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS horizon;" 2>/dev/null || \
    sudo mysql -u root -e "CREATE DATABASE IF NOT EXISTS horizon;"
    print_success "Database 'horizon' created (or already exists)"
fi

# Summary
echo ""
echo "=========================================="
print_success "MySQL root password setup completed!"
echo "=========================================="
echo ""
print_info "MySQL root password has been set"
print_info "Update your .env file with:"
echo "  DB_PASSWORD=$NEW_PASSWORD"
echo ""
print_info "Security recommendations:"
echo "  1. Keep this password secure"
echo "  2. Consider creating a dedicated database user for the application"
echo "  3. Run: sudo mysql_secure_installation for additional security"
echo ""

