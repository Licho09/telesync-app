# TeleSync Deployment Guide - Render.com

This guide will help you deploy your TeleSync application to Render.com for client testing.

## 🚀 Quick Deployment Steps

### 1. **Prepare Your Repository**

First, commit all your changes to Git:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. **Deploy to Render.com**

#### Option A: Using render.yaml (Recommended)
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to deploy both services

#### Option B: Manual Deployment

**Backend Service:**
1. Click "New +" → "Web Service"
2. Connect your GitHub repo
3. Configure:
   - **Name**: `telesync-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

**Frontend Service:**
1. Click "New +" → "Static Site"
2. Connect your GitHub repo
3. Configure:
   - **Name**: `telesync-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### 3. **Environment Variables**

Set these in Render dashboard for your **backend service**:

```
NODE_ENV=production
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_TELEGRAM_BOT_TOKEN=your-telegram-bot-token (optional)
```

Set these for your **frontend service**:
```
VITE_API_BASE_URL=https://your-backend-name.onrender.com/api
VITE_WS_URL=wss://your-backend-name.onrender.com
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. **Update URLs After Deployment**

Once deployed, update your frontend environment variables with the actual backend URL:
- Replace `your-backend-name` with your actual Render service name
- The backend URL will be: `https://your-backend-name.onrender.com`

## 🔧 Alternative Hosting Options

### **Vercel (Recommended Alternative)**
- Better for React apps
- Automatic deployments
- Generous free tier

### **Railway**
- Similar to Render
- Better free tier limits
- Built-in PostgreSQL

### **Netlify + Railway**
- Netlify for frontend
- Railway for backend
- Most cost-effective

## 📋 Pre-Deployment Checklist

- [ ] All changes committed to Git
- [ ] Environment variables documented
- [ ] Production build tested locally (`npm run build`)
- [ ] Supabase project configured
- [ ] Telegram API credentials ready (if needed)

## 🧪 Testing the Deployment

1. **Health Check**: Visit `https://your-backend.onrender.com/api/health`
2. **Frontend**: Visit your frontend URL
3. **WebSocket**: Check browser console for WebSocket connection
4. **Features**: Test login, Telegram connection, and downloads

## 🔍 Troubleshooting

### Common Issues:

1. **Build Failures**: Check Node.js version (use 18+)
2. **Environment Variables**: Ensure all required vars are set
3. **CORS Issues**: Backend should handle CORS properly
4. **WebSocket Issues**: Check if Render supports WebSockets

### Render Free Tier Limitations:
- Services sleep after 15 minutes of inactivity
- Cold starts can take 30+ seconds
- Limited to 750 hours/month per service

## 🎯 Client Testing URL

Once deployed, your client can test at:
- **Frontend**: `https://your-frontend-name.onrender.com`
- **Backend API**: `https://your-backend-name.onrender.com/api/health`

## 📞 Support

If you encounter issues:
1. Check Render logs in the dashboard
2. Verify environment variables
3. Test locally first with production build
4. Check browser console for errors

---

**Ready to deploy?** Follow the steps above and your TeleSync app will be live for client testing! 🚀


