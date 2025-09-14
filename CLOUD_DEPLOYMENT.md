# 🌐 Cloud Deployment Guide

Deploy your Telegram monitor to run 24/7 in the cloud so you don't need to keep your computer running!

## 🚀 Option 1: Railway (Recommended - Free Tier Available)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your repository

### Step 2: Deploy
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `telesync-app` repository
4. Railway will automatically detect the Python files

### Step 3: Configure Environment Variables
In Railway dashboard, add these environment variables:
```
TELEGRAM_USER_ID=demo-user-123
TELEGRAM_API_ID=24409882
TELEGRAM_API_HASH=a13b642bf2d39326e44bf02a5a05707b
TELEGRAM_PHONE=+18327080194
WEB_APP_URL=https://telesync-backend-jkqs.onrender.com
```

### Step 4: Deploy
Railway will automatically deploy and your monitor will run 24/7!

---

## 🚀 Option 2: Heroku (Free Tier Discontinued)

### Step 1: Install Heroku CLI
Download from [heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

### Step 2: Deploy
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-telegram-monitor

# Set environment variables
heroku config:set TELEGRAM_USER_ID=demo-user-123
heroku config:set TELEGRAM_API_ID=24409882
heroku config:set TELEGRAM_API_HASH=a13b642bf2d39326e44bf02a5a05707b
heroku config:set TELEGRAM_PHONE=+18327080194
heroku config:set WEB_APP_URL=https://telesync-backend-jkqs.onrender.com

# Deploy
git push heroku main
```

---

## 🚀 Option 3: DigitalOcean Droplet ($4/month)

### Step 1: Create Droplet
1. Go to [digitalocean.com](https://digitalocean.com)
2. Create a $4/month Ubuntu droplet
3. SSH into your droplet

### Step 2: Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip git -y

# Clone your repository
git clone https://github.com/Licho09/telesync-app.git
cd telesync-app

# Install dependencies
pip3 install -r requirements.txt

# Set environment variables
export TELEGRAM_USER_ID=demo-user-123
export TELEGRAM_API_ID=24409882
export TELEGRAM_API_HASH=a13b642bf2d39326e44bf02a5a05707b
export TELEGRAM_PHONE=+18327080194
export WEB_APP_URL=https://telesync-backend-jkqs.onrender.com

# Run the monitor
python3 telegram_monitor_cloud.py
```

### Step 3: Keep Running (Optional)
```bash
# Install PM2 to keep it running
sudo npm install -g pm2

# Start with PM2
pm2 start telegram_monitor_cloud.py --name telegram-monitor

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 🎯 Benefits of Cloud Deployment

✅ **24/7 Monitoring** - Never miss a video download
✅ **No Computer Required** - Runs independently 
✅ **Automatic Restarts** - If it crashes, it restarts automatically
✅ **Remote Access** - Monitor from anywhere
✅ **Cost Effective** - $0-5/month for 24/7 service

---

## 🔧 Troubleshooting

### Monitor Not Starting
- Check environment variables are set correctly
- Verify your Telegram API credentials
- Check the logs in your cloud provider dashboard

### No Downloads
- Make sure you have channels added in your web app
- Verify the monitor is connected to Telegram
- Check that videos are being posted to monitored channels

### Connection Issues
- Ensure your web app backend is running
- Check that the WEB_APP_URL is correct
- Verify your internet connection

---

## 📊 Monitoring Your Cloud Service

Most cloud providers offer:
- **Logs** - See what the monitor is doing
- **Metrics** - CPU, memory usage
- **Alerts** - Get notified if it goes down
- **Restart** - Manual restart if needed

Your Telegram monitor will now run 24/7 in the cloud! 🎉
