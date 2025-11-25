# Deployment Guide

This guide explains how to deploy the Horizon Backend application to a production server.

## Prerequisites

Before deploying, ensure you have:
- A Linux server (Ubuntu 20.04+ recommended)
- SSH access to the server
- Root or sudo access
- Git repository access (if deploying from Git)

### Setting Up Ubuntu User with Sudo Access

If you need to grant sudo/root access to the `ubuntu` user:

```bash
# Option 1: Make script executable first
chmod +x setup-ubuntu-user.sh
sudo ./setup-ubuntu-user.sh

# Option 2: Run directly with bash (no chmod needed)
sudo bash setup-ubuntu-user.sh
```

**Note:** If you get "Permission denied" error, use `chmod +x` or run with `bash` directly.

This script will:
- Add `ubuntu` user to sudo group
- Add `ubuntu` user to adm group (for log access)
- Optionally configure passwordless sudo
- Set up SSH directory with proper permissions

## Quick Start

### 1. Install Prerequisites

On your server, run the prerequisites installation script:

```bash
# Make script executable
chmod +x install-prerequisites.sh

# Run the script
./install-prerequisites.sh
```

This script will install:
- Node.js 20.x
- npm
- PM2 (Process Manager)
- MySQL Server
- TypeScript and ts-node
- Nginx (optional, for reverse proxy)
- phpMyAdmin (optional, for database management)

### 2. Configure MySQL

After installation, configure MySQL:

**Option 1: Using the setup script (Recommended)**
```bash
# Make script executable
chmod +x setup-mysql-password.sh

# Run the script
sudo bash setup-mysql-password.sh
```

**Option 2: Manual configuration**
```bash
# Secure MySQL installation (sets root password)
sudo mysql_secure_installation

# Create database
mysql -u root -p -e "CREATE DATABASE horizon;"
```

**Note:** On Ubuntu/Debian, MySQL root user may use `auth_socket` authentication by default, allowing login without password using `sudo mysql`. The setup script handles this automatically.

### 2.5. Install and Configure phpMyAdmin (Optional)

If you selected phpMyAdmin during prerequisites installation, configure it:

```bash
# Make script executable
chmod +x install-phpmyadmin.sh

# Run configuration
sudo bash install-phpmyadmin.sh
```

This will:
- Configure web server (Apache/Nginx) for phpMyAdmin
- Set up security settings
- Optionally add password protection
- Access phpMyAdmin at: `http://sql.indicator-app.com/phpmyadmin` (Apache) or `http://sql.indicator-app.com/` (Nginx)

**If you get 404 error accessing phpMyAdmin:**

```bash
# Run the fix script
sudo bash fix-phpmyadmin.sh
```

This script will:
- Check if phpMyAdmin is installed
- Verify web server configuration
- Fix Apache/Nginx configuration
- Ensure PHP and extensions are installed
- Set proper permissions
- Provide access URLs

### 3. Deploy Application

Run the deployment script:

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment (uses default: /var/www/horizon-backend)
./deploy.sh
```

#### Custom App Directory

You can deploy to a custom directory by setting the `APP_DIR` environment variable:

```bash
# Option 1: Set in the same command
APP_DIR=/home/username/horizon-backend ./deploy.sh

# Option 2: Export first, then run
export APP_DIR=/opt/horizon-backend
./deploy.sh

# Option 3: Deploy from current directory
APP_DIR=$(pwd) ./deploy.sh
```

**Recommended Locations:**
- `/var/www/horizon-backend` - Standard web app location (default)
- `/opt/horizon-backend` - Alternative system-wide location
- `/home/username/horizon-backend` - User-specific location (no sudo needed)
- Current directory - For development/testing

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Clone Repository

```bash
cd /var/www
git clone <your-repository-url> horizon-backend
cd horizon-backend
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Build Application

```bash
npm run build
```

### 4. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
nano .env
```

Update with your configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=horizon
JWT_SECRET=your_very_secure_jwt_secret_key
NODE_ENV=production
PORT=3000
```

### 5. Run Migrations

```bash
npm run migration:run
```

### 6. Seed Database (Optional)

```bash
npm run seed
```

### 7. Start with PM2

```bash
# Start application
pm2 start dist/main.js --name horizon-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## PM2 Management

### View Application Status

```bash
pm2 status
pm2 logs horizon-backend
```

### Restart Application

```bash
pm2 restart horizon-backend
```

### Stop Application

```bash
pm2 stop horizon-backend
```

### View Logs

```bash
# All logs
pm2 logs horizon-backend

# Error logs only
pm2 logs horizon-backend --err

# Real-time logs
pm2 logs horizon-backend --lines 100
```

## Nginx Status Check

To check if Nginx is installed and running:

```bash
# Make script executable
chmod +x check-nginx.sh

# Run check
sudo bash check-nginx.sh
```

This script will:
- Check if Nginx is installed
- Check if Nginx is running
- Validate Nginx configuration
- Start Nginx if it's not running
- Enable Nginx to start on boot
- Show Nginx status and useful information

## Nginx Configuration

### Backend Configuration

If you installed Nginx, set up a reverse proxy to make the backend accessible:

#### Automated Setup (Recommended)

Use the provided setup script:

```bash
# Make script executable
chmod +x setup-nginx-backend.sh

# Run the setup script
sudo bash setup-nginx-backend.sh
```

The script will:
- Check if Nginx is installed (install if needed)
- Copy the Nginx configuration file (`nginx-horizon-backend.conf`)
- Enable the site
- Test and reload Nginx
- Configure `/api` to proxy to `http://localhost:3000`

**Note:** You can customize the backend port by setting the `BACKEND_PORT` environment variable:
```bash
BACKEND_PORT=3001 sudo bash setup-nginx-backend.sh
```

### phpMyAdmin (SQL) Configuration

Set up Nginx to serve phpMyAdmin at `sql.indicator-app.com`:

#### Automated Setup (Recommended)

```bash
# Make script executable
chmod +x setup-nginx-phpmyadmin.sh

# Run the setup script
sudo bash setup-nginx-phpmyadmin.sh
```

The script will:
- Check if Nginx is installed
- Verify phpMyAdmin is installed
- Check and start PHP-FPM if needed
- Copy the Nginx configuration file (`nginx-phpmyadmin.conf`)
- Enable the site
- Test and reload Nginx
- Configure `sql.indicator-app.com` to serve phpMyAdmin

**Prerequisites:**
- phpMyAdmin must be installed (run `install-phpmyadmin.sh` first)
- PHP-FPM must be installed and running

#### Manual Setup

If you prefer to set up manually:

1. Copy the configuration file:
```bash
sudo cp nginx-horizon-backend.conf /etc/nginx/sites-available/horizon-backend
```

2. Edit the configuration (optional - to set your domain/IP):
```bash
sudo nano /etc/nginx/sites-available/horizon-backend
```

Update `server_name` with your domain or IP address.

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/horizon-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site if needed
```

4. Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### Configuration Details

The Nginx configuration proxies `/api` requests to the backend service:
- Backend API: `http://backend.indicator-app.com/api`
- Swagger Docs: `http://backend.indicator-app.com/api`
- Health Check: `http://backend.indicator-app.com/health`

The backend service should be running on `localhost:3000` (or the port specified in your `.env` file).

#### Manual phpMyAdmin Setup

If you prefer to set up phpMyAdmin manually:

1. Copy the configuration file:
```bash
sudo cp nginx-phpmyadmin.conf /etc/nginx/sites-available/phpmyadmin
```

2. Edit the configuration (optional):
```bash
sudo nano /etc/nginx/sites-available/phpmyadmin
```

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/phpmyadmin /etc/nginx/sites-enabled/
```

4. Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

phpMyAdmin will be accessible at: `http://sql.indicator-app.com/`

## SSL Certificate (Let's Encrypt)

To enable HTTPS for both backend and phpMyAdmin domains:

### Automated Setup (Recommended)

Use the provided SSL setup script:

```bash
# Make script executable
chmod +x setup-ssl.sh

# Run the SSL setup script
sudo bash setup-ssl.sh
```

The script will:
- Install Certbot if not already installed
- Obtain SSL certificates for `backend.indicator-app.com`
- Obtain SSL certificates for `sql.indicator-app.com`
- Obtain SSL certificates for `dashboard.indicator-app.com`
- Configure Nginx to use HTTPS with automatic HTTP to HTTPS redirect
- Set up automatic certificate renewal
- Test certificate renewal process

**Prerequisites:**
- DNS must be configured to point all domains to your server's IP:
  - `backend.indicator-app.com`
  - `sql.indicator-app.com`
  - `dashboard.indicator-app.com`
- Port 80 and 443 must be open in your firewall
- Nginx must be installed and configured (run `setup-nginx-backend.sh` first)

**Note:** You'll be prompted for an email address for Let's Encrypt expiration notifications. You can also set it via environment variable:
```bash
SSL_EMAIL=your-email@example.com sudo bash setup-ssl.sh
```

### Manual Setup

If you prefer to set up SSL manually:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate for backend
sudo certbot --nginx -d backend.indicator-app.com

# Obtain certificate for phpMyAdmin
sudo certbot --nginx -d sql.indicator-app.com

# Obtain certificate for dashboard
sudo certbot --nginx -d dashboard.indicator-app.com

# Auto-renewal is set up automatically
```

### Certificate Management

```bash
# View all certificates
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Test renewal (dry run)
sudo certbot renew --dry-run

# Check auto-renewal status
sudo systemctl status certbot.timer

# View renewal logs
sudo journalctl -u certbot.timer
```

### Access URLs After SSL Setup

- **Backend API**: `https://backend.indicator-app.com/api`
- **Backend Swagger**: `https://backend.indicator-app.com/api`
- **phpMyAdmin**: `https://sql.indicator-app.com/`
- **Dashboard**: `https://dashboard.indicator-app.com/`

## Environment Variables

### Required Variables

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 3306)
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `NODE_ENV` - Environment (production/development)
- `PORT` - Application port (default: 3000)

### Optional Variables

- `JWT_EXPIRES_IN` - JWT token expiration (default: 7d)

## Updating Application

To update the application:

```bash
cd /var/www/horizon-backend

# Pull latest changes
git pull origin main

# Install new dependencies
npm ci

# Build application
npm run build

# Run new migrations (if any)
npm run migration:run

# Restart application
pm2 restart horizon-backend
```

## Troubleshooting

### Application won't start

1. Check logs: `pm2 logs horizon-backend`
2. Verify .env file exists and has correct values
3. Check database connection
4. Verify port is not in use: `sudo netstat -tulpn | grep 3000`

### Database connection errors

1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check database credentials in .env
3. Verify database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Permission errors

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/horizon-backend
sudo chown -R $USER:$USER /var/log/horizon-backend
```

## Monitoring

### PM2 Monitoring

```bash
# Monitor in real-time
pm2 monit

# View process information
pm2 show horizon-backend
```

### System Resources

```bash
# Check system resources
htop

# Check disk space
df -h

# Check memory
free -h
```

## Backup

### Database Backup

```bash
# Create backup
mysqldump -u root -p horizon > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u root -p horizon < backup_20240101.sql
```

### Application Backup

The deployment script automatically creates backups before deployment in the format:
`/var/www/horizon-backend_backup_YYYYMMDD_HHMMSS`

## Security Considerations

1. **Change default passwords**: Update MySQL root password and JWT secret
2. **Firewall**: Configure UFW or iptables to only allow necessary ports
3. **SSL/TLS**: Always use HTTPS in production
4. **Environment variables**: Never commit .env file to version control
5. **Regular updates**: Keep system packages and dependencies updated

## Support

For issues or questions:
- Check application logs: `pm2 logs horizon-backend`
- Review error messages in `/var/log/horizon-backend/`
- Check PM2 status: `pm2 status`

