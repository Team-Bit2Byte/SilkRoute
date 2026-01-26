# Deployment Guide

## Overview
This guide covers deploying SilkRoute to various environments, from development to production. The application supports multiple deployment strategies including Docker, cloud platforms, and traditional server deployment.

## Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Memory**: Minimum 512MB RAM (2GB+ recommended for production)
- **Storage**: Minimum 1GB free space
- **Network**: Ports 3000 (frontend) and 5000 (backend) available

### Development Tools
- **Docker**: v20.0+ (optional but recommended)
- **Docker Compose**: v2.0+ (for multi-container deployment)
- **Git**: For version control

## Environment Configuration

### Backend Environment Variables

Create `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DATABASE_PATH=/data/silkroute.db
DB_CONNECTION_TIMEOUT=30000
DB_BUSY_TIMEOUT=30000

# JWT Configuration (CRITICAL: Change in production)
JWT_SECRET=your-super-secure-production-secret-use-openssl-rand-base64-32
JWT_EXPIRES_IN=7d

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100

# Security Configuration
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined

# External Services (Optional)
LIBRETRANSLATE_API_URL=https://libretranslate.com/translate
LIBRETRANSLATE_API_KEY=your-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
```

### Frontend Environment Variables

Create `.env.local` file in the `frontend/` directory:

```env
# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# API Configuration
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com

# Environment
NODE_ENV=production
```

## Local Development Deployment

### Manual Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd SilkRoute
   ```

2. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   npm install
   npm run dev
   ```

### Docker Development

1. **Using Docker Compose**
   ```bash
   # Development environment
   docker-compose -f docker-compose.dev.yml up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   ```

## Production Deployment

### Docker Production Deployment

1. **Create Production Docker Compose**
   ```yaml
   # docker-compose.prod.yml
   version: '3.8'
   
   services:
     backend:
       build:
         context: ./backend
         dockerfile: Dockerfile
       ports:
         - "5000:5000"
       environment:
         - NODE_ENV=production
       env_file:
         - ./backend/.env
       volumes:
         - ./data:/data
         - ./logs:/app/logs
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   
     frontend:
       build:
         context: ./frontend
         dockerfile: Dockerfile
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       env_file:
         - ./frontend/.env.local
       depends_on:
         - backend
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/nginx/ssl
       depends_on:
         - frontend
         - backend
       restart: unless-stopped
   ```

2. **Deploy**
   ```bash
   # Build and start services
   docker-compose -f docker-compose.prod.yml up -d
   
   # Check status
   docker-compose -f docker-compose.prod.yml ps
   
   # View logs
   docker-compose -f docker-compose.prod.yml logs -f
   ```

### Manual Production Deployment

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone <repository-url> /var/www/silkroute
   cd /var/www/silkroute
   
   # Backend setup
   cd backend
   npm ci --production
   
   # Frontend setup
   cd ../frontend
   npm ci --production
   npm run build
   
   # Set permissions
   sudo chown -R www-data:www-data /var/www/silkroute
   ```

3. **PM2 Configuration**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [
       {
         name: 'silkroute-backend',
         script: './backend/src/server.js',
         cwd: '/var/www/silkroute',
         instances: 'max',
         exec_mode: 'cluster',
         env: {
           NODE_ENV: 'production',
           PORT: 5000
         },
         error_file: '/var/log/silkroute/backend-error.log',
         out_file: '/var/log/silkroute/backend-out.log',
         log_file: '/var/log/silkroute/backend.log'
       },
       {
         name: 'silkroute-frontend',
         script: 'npm',
         args: 'start',
         cwd: '/var/www/silkroute/frontend',
         env: {
           NODE_ENV: 'production',
           PORT: 3000
         },
         error_file: '/var/log/silkroute/frontend-error.log',
         out_file: '/var/log/silkroute/frontend-out.log',
         log_file: '/var/log/silkroute/frontend.log'
       }
     ]
   };
   ```

4. **Start Services**
   ```bash
   # Create log directory
   sudo mkdir -p /var/log/silkroute
   sudo chown www-data:www-data /var/log/silkroute
   
   # Start applications
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/silkroute
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:5000;
        access_log off;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Cloud Platform Deployment

### AWS Deployment

1. **EC2 Instance Setup**
   ```bash
   # Launch EC2 instance (t3.medium or larger)
   # Configure security groups (ports 22, 80, 443)
   # Attach Elastic IP
   
   # Connect to instance
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Follow manual deployment steps above
   ```

2. **RDS Database (Optional)**
   ```bash
   # Create PostgreSQL RDS instance
   # Update backend .env with RDS connection string
   DATABASE_URL=postgresql://username:password@rds-endpoint:5432/silkroute
   ```

3. **S3 for Static Assets (Optional)**
   ```bash
   # Create S3 bucket for file uploads
   # Configure IAM roles and policies
   # Update application configuration
   ```

### Google Cloud Platform

1. **Compute Engine**
   ```bash
   # Create VM instance
   gcloud compute instances create silkroute-server \
     --image-family=ubuntu-2004-lts \
     --image-project=ubuntu-os-cloud \
     --machine-type=e2-medium \
     --zone=us-central1-a
   
   # SSH into instance
   gcloud compute ssh silkroute-server --zone=us-central1-a
   ```

2. **Cloud SQL (Optional)**
   ```bash
   # Create PostgreSQL instance
   gcloud sql instances create silkroute-db \
     --database-version=POSTGRES_13 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

### DigitalOcean

1. **Droplet Creation**
   ```bash
   # Create droplet via web interface or API
   # Choose Ubuntu 20.04, 2GB RAM minimum
   # Add SSH key
   
   # Connect and deploy
   ssh root@your-droplet-ip
   ```

2. **Managed Database (Optional)**
   ```bash
   # Create managed PostgreSQL database
   # Update connection string in .env
   ```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Custom SSL Certificate

```bash
# Place certificate files
sudo mkdir -p /etc/nginx/ssl
sudo cp your-cert.pem /etc/nginx/ssl/cert.pem
sudo cp your-key.pem /etc/nginx/ssl/key.pem
sudo chmod 600 /etc/nginx/ssl/*
```

## Database Migration

### SQLite to PostgreSQL

1. **Export SQLite Data**
   ```bash
   # Install sqlite3-to-postgresql
   pip install sqlite3-to-postgresql
   
   # Convert database
   sqlite3-to-postgresql \
     --sqlite-file backend/database.sqlite \
     --postgresql-host localhost \
     --postgresql-database silkroute \
     --postgresql-user username \
     --postgresql-password password
   ```

2. **Update Configuration**
   ```env
   # Update backend/.env
   DATABASE_URL=postgresql://username:password@localhost:5432/silkroute
   ```

## Monitoring and Logging

### Application Monitoring

1. **PM2 Monitoring**
   ```bash
   # Monitor processes
   pm2 monit
   
   # View logs
   pm2 logs
   
   # Restart applications
   pm2 restart all
   ```

2. **Log Rotation**
   ```bash
   # Configure logrotate
   sudo nano /etc/logrotate.d/silkroute
   ```
   
   ```
   /var/log/silkroute/*.log {
       daily
       missingok
       rotate 52
       compress
       delaycompress
       notifempty
       create 644 www-data www-data
       postrotate
           pm2 reloadLogs
       endscript
   }
   ```

### System Monitoring

1. **Install Monitoring Tools**
   ```bash
   # Install htop, iotop, netstat
   sudo apt install htop iotop net-tools -y
   
   # Monitor system resources
   htop
   iotop
   netstat -tulpn
   ```

2. **Health Check Script**
   ```bash
   #!/bin/bash
   # health-check.sh
   
   # Check if services are running
   if ! pm2 list | grep -q "online"; then
       echo "PM2 services not running"
       pm2 restart all
   fi
   
   # Check disk space
   DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
   if [ $DISK_USAGE -gt 80 ]; then
       echo "Disk usage is ${DISK_USAGE}%"
   fi
   
   # Check memory usage
   MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
   if [ $MEMORY_USAGE -gt 80 ]; then
       echo "Memory usage is ${MEMORY_USAGE}%"
   fi
   ```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/silkroute"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup SQLite database
cp /var/www/silkroute/backend/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup environment files
cp /var/www/silkroute/backend/.env $BACKUP_DIR/backend_env_$DATE
cp /var/www/silkroute/frontend/.env.local $BACKUP_DIR/frontend_env_$DATE

# Compress backups older than 7 days
find $BACKUP_DIR -name "*.sqlite" -mtime +7 -exec gzip {} \;

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Automated Backups

```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /var/www/silkroute/scripts/backup.sh >> /var/log/backup.log 2>&1
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   sudo lsof -i :5000
   
   # Kill process
   sudo kill -9 <PID>
   ```

2. **Permission Denied**
   ```bash
   # Fix file permissions
   sudo chown -R www-data:www-data /var/www/silkroute
   sudo chmod -R 755 /var/www/silkroute
   ```

3. **Database Connection Failed**
   ```bash
   # Check database file permissions
   ls -la backend/database.sqlite
   
   # Ensure directory is writable
   chmod 755 backend/
   chmod 644 backend/database.sqlite
   ```

4. **SSL Certificate Issues**
   ```bash
   # Test SSL configuration
   sudo nginx -t
   
   # Check certificate validity
   openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout
   ```

### Log Analysis

```bash
# Backend logs
tail -f /var/log/silkroute/backend.log

# Frontend logs
tail -f /var/log/silkroute/frontend.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
tail -f /var/log/syslog
```

## Performance Optimization

### Application Optimization

1. **Enable Compression**
   ```javascript
   // Add to backend server
   const compression = require('compression');
   app.use(compression());
   ```

2. **Static File Caching**
   ```nginx
   # Add to nginx configuration
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### Database Optimization

1. **SQLite Optimization**
   ```sql
   -- Run periodically
   VACUUM;
   ANALYZE;
   ```

2. **Index Optimization**
   ```sql
   -- Check existing indexes
   .indexes
   
   -- Add missing indexes
   CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(created_at);
   ```

## Security Checklist

- [ ] Strong JWT secrets configured
- [ ] HTTPS/TLS enabled with valid certificates
- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key authentication (disable password auth)
- [ ] Regular security updates
- [ ] Database access restricted
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Backup encryption enabled
- [ ] Log file permissions secured

## Maintenance

### Regular Tasks

1. **Weekly**
   - Check application logs for errors
   - Monitor system resources
   - Verify backups are working
   - Update dependencies (`npm audit`)

2. **Monthly**
   - Security updates
   - Certificate renewal check
   - Performance analysis
   - Database optimization

3. **Quarterly**
   - Full security audit
   - Disaster recovery testing
   - Performance benchmarking
   - Documentation updates

This deployment guide provides comprehensive instructions for deploying SilkRoute in various environments. Choose the deployment method that best fits your requirements and infrastructure.
