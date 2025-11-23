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
# Make script executable
chmod +x setup-ubuntu-user.sh

# Run as root
sudo ./setup-ubuntu-user.sh
```

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

### 2. Configure MySQL

After installation, configure MySQL:

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database
mysql -u root -p -e "CREATE DATABASE horizon;"
```

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

## Nginx Configuration (Optional)

If you installed Nginx, create a reverse proxy configuration:

```bash
sudo nano /etc/nginx/sites-available/horizon-backend
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/horizon-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

To enable HTTPS:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

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

