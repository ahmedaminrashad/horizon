#!/bin/bash

# Script to grant sudo/root access to ubuntu user
# This should be run as root or by a user with sudo privileges

set -e  # Exit on any error

echo "=========================================="
echo "Ubuntu User - Sudo Access Setup"
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
    print_info "Please run: sudo ./setup-ubuntu-user.sh"
    exit 1
fi

USERNAME="ubuntu"

# Check if ubuntu user exists
if id "$USERNAME" &>/dev/null; then
    print_success "User '$USERNAME' exists"
else
    print_error "User '$USERNAME' does not exist"
    read -p "Do you want to create the ubuntu user? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Creating user '$USERNAME'..."
        adduser --disabled-password --gecos "" $USERNAME
        print_success "User '$USERNAME' created"
    else
        print_error "Cannot proceed without user. Exiting."
        exit 1
    fi
fi

# Add user to sudo group
print_info "Adding '$USERNAME' to sudo group..."
if groups $USERNAME | grep -q "\bsudo\b"; then
    print_success "User '$USERNAME' is already in sudo group"
else
    usermod -aG sudo $USERNAME
    print_success "User '$USERNAME' added to sudo group"
fi

# Add user to adm group (for reading log files)
print_info "Adding '$USERNAME' to adm group..."
if groups $USERNAME | grep -q "\badm\b"; then
    print_success "User '$USERNAME' is already in adm group"
else
    usermod -aG adm $USERNAME
    print_success "User '$USERNAME' added to adm group"
fi

# Configure passwordless sudo (optional)
read -p "Do you want to configure passwordless sudo for '$USERNAME'? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Configuring passwordless sudo..."
    
    # Create sudoers file for ubuntu user
    SUDOERS_FILE="/etc/sudoers.d/ubuntu"
    
    cat > $SUDOERS_FILE << EOF
# Allow ubuntu user to run all commands without password
$USERNAME ALL=(ALL) NOPASSWD: ALL
EOF
    
    # Set proper permissions
    chmod 0440 $SUDOERS_FILE
    
    # Verify sudoers file syntax
    if visudo -c -f $SUDOERS_FILE; then
        print_success "Passwordless sudo configured successfully"
    else
        print_error "Error in sudoers file. Removing it..."
        rm -f $SUDOERS_FILE
        exit 1
    fi
else
    print_info "Passwordless sudo not configured. User will need to enter password for sudo commands."
fi

# Set up SSH directory and authorized_keys if needed
print_info "Setting up SSH directory..."
if [ ! -d "/home/$USERNAME/.ssh" ]; then
    mkdir -p /home/$USERNAME/.ssh
    chmod 700 /home/$USERNAME/.ssh
    print_success "SSH directory created"
fi

# Set proper ownership
chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh

# Summary
echo ""
echo "=========================================="
print_success "Setup completed successfully!"
echo "=========================================="
echo ""
print_info "User '$USERNAME' now has:"
echo "  ✓ Sudo access (root privileges)"
echo "  ✓ Access to system logs (adm group)"
echo ""

# Test sudo access
print_info "To verify, switch to ubuntu user and test:"
echo "  su - $USERNAME"
echo "  sudo whoami  # Should output 'root'"
echo ""
print_info "Or test from current session:"
echo "  sudo -u $USERNAME sudo whoami"
echo ""

