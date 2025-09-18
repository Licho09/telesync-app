# Frontend Debug Guide

## Quick Fix Steps

### 1. **Start the Development Server**
```bash
# In your project directory
npm run dev
```

This should start the frontend on `http://localhost:5173`

### 2. **Start the Backend Server** (in a separate terminal)
```bash
# In your project directory
node server.js
```

This should start the backend on `http://localhost:3001`

### 3. **Check Browser Console**
1. Open `http://localhost:5173` in your browser
2. Press F12 to open Developer Tools
3. Check the Console tab for any errors
4. Check the Network tab to see if requests are failing

## Common Issues & Solutions

### Issue 1: Blank Page
**Cause**: JavaScript errors preventing React from rendering
**Solution**: Check browser console for errors

### Issue 2: "Cannot connect to server"
**Cause**: Backend server not running
**Solution**: Start the backend with `node server.js`

### Issue 3: "Module not found" errors
**Cause**: Missing dependencies
**Solution**: Run `npm install`

### Issue 4: Authentication issues
**Cause**: Supabase configuration
**Solution**: The app runs in demo mode by default, so this shouldn't be an issue

## What Should Happen

1. **Landing Page**: You should see the TeleSync landing page
2. **Login**: Click "Get started" or "Log in" 
3. **Demo Mode**: You'll be automatically logged in as "Demo User"
4. **Dashboard**: You should see the dashboard with Discord channels section

## If Still Blank

### Check These Files:
1. `src/main.tsx` - Entry point
2. `src/App.tsx` - Main app component
3. `src/contexts/AuthContext.tsx` - Authentication
4. `src/components/Dashboard.tsx` - Main dashboard

### Temporary Fix:
I've temporarily disabled the new Telegram components that might be causing issues. Your original dashboard should work now.

## Test Commands

```bash
# Check if frontend builds
npm run build

# Check for linting errors
npm run lint

# Start frontend only
npm run dev

# Start backend only
npm run server

# Start both (recommended)
npm run dev:full
```

## Expected URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Health Check: `http://localhost:3001/api/health`

If you're still seeing a blank page, please:
1. Check the browser console for errors
2. Make sure both servers are running
3. Try refreshing the page
4. Check if you can access `http://localhost:3001/api/health`











