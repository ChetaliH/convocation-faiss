#!/bin/bash
# scripts/deploy.sh - CORRECTED VERSION

echo "Starting convocation-faiss deployment from GitHub..."

# Variables
REPO_URL="https://github.com/ChetaliH/convocation-faiss.git"
APP_DIR="/var/www/convocation-faiss"
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)  # FIXED: Correct metadata URL

# Check if we got the IP
if [ -z "$EC2_IP" ]; then
    echo "Warning: Could not get EC2 public IP. Using localhost for now."
    EC2_IP="localhost"
fi

echo "Using EC2 IP: $EC2_IP"

# Update system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install required software
echo "Installing system dependencies..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo apt install python3 python3-pip python3-venv build-essential cmake -y
sudo apt-get install -y libopenblas-dev liblapack-dev libx11-dev libgtk-3-dev python3-dev
sudo npm install -g pm2
sudo apt install nginx -y

# Clone repository
echo "Cloning repository..."
sudo rm -rf $APP_DIR
sudo mkdir -p $APP_DIR
sudo chown -R ubuntu:ubuntu $APP_DIR
cd /var/www
git clone $REPO_URL convocation-faiss
cd $APP_DIR
mkdir -p uploads logs

# Setup backend
echo "Setting up Node.js backend..."
cd $APP_DIR/backend
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in backend directory"
    exit 1
fi
npm install

# Create environment file
cat > .env << EOF
PORT=3001
FLASK_API_URL=http://localhost:5000
NODE_ENV=production
EOF

# Setup Flask API
echo "Setting up Flask API..."
cd $APP_DIR/flask-api
if [ ! -f "requirements.txt" ]; then
    echo "ERROR: requirements.txt not found in flask-api directory"
    exit 1
fi
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend-new (CORRECTED: Using frontend-new based on your file structure)
echo "Setting up React frontend..."
cd $APP_DIR/frontend-new
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in frontend-new directory"
    exit 1
fi
npm install

# Create production environment
echo "REACT_APP_API_BASE_URL=http://${EC2_IP}" > .env.production
echo "Building React app..."
npm run build

if [ ! -d "build" ]; then
    echo "ERROR: React build failed - build directory not found"
    exit 1
fi

echo "Deployment complete! Run setup-services.sh to configure services."