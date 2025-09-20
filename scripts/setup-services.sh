#!/bin/bash
# scripts/setup-services.sh - CORRECTED FOR AMAZON LINUX

APP_DIR="/var/www/convocation-faiss"
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

if [ -z "$EC2_IP" ]; then
    echo "Warning: Could not get EC2 public IP. Using localhost for now."
    EC2_IP="localhost"
fi

echo "Configuring services with IP: $EC2_IP"

# Setup Flask systemd service (use ec2-user instead of ubuntu)
sudo tee /etc/systemd/system/flask-api.service > /dev/null << EOF
[Unit]
Description=Flask Face Recognition API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=$APP_DIR/flask-api
Environment=PATH=$APP_DIR/flask-api/venv/bin
ExecStart=$APP_DIR/flask-api/venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Setup PM2 ecosystem for backend
cd $APP_DIR/backend
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'convocation-faiss-backend',
    script: 'server.js',
    cwd: '$APP_DIR/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      FLASK_API_URL: 'http://localhost:5000'
    },
    error_file: '$APP_DIR/logs/backend-error.log',
    out_file: '$APP_DIR/logs/backend-out.log',
    log_file: '$APP_DIR/logs/backend.log'
  }]
};
EOF

# Setup Nginx
sudo tee /etc/nginx/conf.d/convocation-faiss.conf << EOF
server {
    listen 80;
    server_name ${EC2_IP};

    # Serve React app from frontend-new/build
    location / {
        root $APP_DIR/frontend-new/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    client_max_body_size 10M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# Enable services
sudo systemctl enable flask-api
sudo systemctl enable nginx

# Test Nginx configuration
if sudo nginx -t; then
    echo "Nginx configuration is valid"
else
    echo "ERROR: Nginx configuration failed"
    exit 1
fi

echo "Services configured successfully!"