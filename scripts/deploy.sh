#!/bin/bash
# scripts/deploy.sh - CORRECTED FOR AMAZON LINUX

echo "Starting convocation-faiss deployment from GitHub on Amazon Linux..."

# Variables
REPO_URL="https://github.com/ChetaliH/convocation-faiss.git"
APP_DIR="/var/www/convocation-faiss"
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Check if we got the IP
if [ -z "$EC2_IP" ]; then
    echo "Warning: Could not get EC2 public IP. Using localhost for now."
    EC2_IP="localhost"
fi

echo "Using EC2 IP: $EC2_IP"

# Update system (Amazon Linux uses yum)
echo "Updating system..."
sudo yum update -y

# Install required software for Amazon Linux
echo "Installing system dependencies..."

# Install Node.js 18
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Git (usually pre-installed)
sudo yum install -y git

# Install Python 3 and development tools
sudo yum install -y python3 python3-pip python3-devel
sudo yum groupinstall -y "Development Tools"
sudo yum install -y cmake

# Install additional dependencies for face recognition
sudo yum install -y openblas-devel lapack-devel
sudo yum install -y libX11-devel gtk3-devel

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo amazon-linux-extras enable nginx1
sudo yum install -y nginx

# Clone repository (use ec2-user instead of ubuntu)
echo "Cloning repository..."
sudo rm -rf $APP_DIR
sudo mkdir -p $APP_DIR
sudo chown -R ec2-user:ec2-user $APP_DIR
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
pip install --upgrade pip
pip install -r requirements.txt

# Setup frontend-new
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