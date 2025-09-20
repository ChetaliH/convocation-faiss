#!/bin/bash

APP_DIR="/var/www/convocation-faiss"
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)  # FIXED: Correct metadata URL

if [ -z "$EC2_IP" ]; then
    EC2_IP=$(hostname -I | awk '{print $1}')  # Fallback to local IP
fi

echo "Starting all services..."

# Start Flask API
sudo systemctl daemon-reload
sudo systemctl start flask-api

echo "Flask API status:"
if sudo systemctl is-active --quiet flask-api; then
    echo "✓ Flask API is running"
else
    echo "✗ Flask API failed to start"
    sudo systemctl status flask-api --no-pager
fi

# Start Node.js backend
cd $APP_DIR/backend
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 to start on boot
pm2 startup ubuntu --hp /home/ubuntu

# Start Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "All services started!"
echo "Application should be available at: http://${EC2_IP}"

# Show comprehensive status
echo ""
echo "=== Service Status ==="
echo "Flask API:"
sudo systemctl status flask-api --no-pager -l | head -10

echo ""
echo "Backend (PM2):"
pm2 status

echo ""
echo "Nginx:"
sudo systemctl status nginx --no-pager | head -10

echo ""
echo "Port status:"
netstat -tlnp | grep -E ':80|:3001|:5000' 2>/dev/null || ss -tlnp | grep -E ':80|:3001|:5000'

echo ""
echo "=== Quick Health Check ==="
echo "Testing Flask API: curl http://localhost:5000/health"
curl -s http://localhost:5000/health | head -1 || echo "Flask API not responding"

echo ""
echo "Testing Node.js API: curl http://localhost:3001/api/health"  
curl -s http://localhost:3001/api/health | head -1 || echo "Node.js API not responding"

echo ""
echo "Testing Nginx: curl http://localhost/"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost/ || echo "Nginx not responding"