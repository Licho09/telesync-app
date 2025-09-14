# Multi-User Telegram Setup Guide

## Overview
The application is designed to support multiple users, each with their own Telegram account. Here's how to set it up for multiple users.

## Current System Architecture

### ✅ Already Supports Multiple Users
- **User Isolation**: Each user has their own `userId` and session
- **Individual Sessions**: Each user gets their own Telegram session file
- **Separate Channels**: Each user manages their own channels
- **Independent Monitoring**: Each user has their own Telegram monitor process

## Setup Options

### Option 1: Shared API Credentials (Recommended for Small Teams)

#### What You Need:
1. **One Telegram API Application** (from my.telegram.org)
2. **Shared API ID and Hash** for all users
3. **Backend Configuration**

#### Steps:

1. **Get Telegram API Credentials** (One-time setup):
   ```bash
   # Visit https://my.telegram.org
   # Create a new application
   # Get your API ID and API Hash
   ```

2. **Configure Backend**:
   ```javascript
   // In server.js, set DEMO_MODE = false
   const DEMO_MODE = false;
   
   // Add your credentials to telegram_config.json
   {
     "api_id": YOUR_API_ID,
     "api_hash": "YOUR_API_HASH",
     "phone_number": "+1234567890" // Optional: admin phone
   }
   ```

3. **For Each New User**:
   - User signs up with email/password
   - User logs in to dashboard
   - User connects their Telegram account:
     - Enters their phone number
     - Enters verification code
     - System creates their personal session

#### Benefits:
- ✅ Simple setup
- ✅ One API application needed
- ✅ All users work immediately
- ✅ Shared API limits (usually sufficient)

#### Limitations:
- ⚠️ Shared API rate limits
- ⚠️ All users tied to one API application

### Option 2: Individual API Credentials (For Large Teams)

#### What You Need:
1. **Separate Telegram API Application** for each user
2. **Individual API IDs and Hashes**
3. **Enhanced Backend Configuration**

#### Steps:

1. **Each User Gets Their Own API Credentials**:
   ```bash
   # Each user visits https://my.telegram.org
   # Creates their own application
   # Gets their own API ID and Hash
   ```

2. **Enhanced Backend Configuration**:
   ```javascript
   // Store user-specific credentials
   const userApiCredentials = {
     "user1": {
       "api_id": 12345,
       "api_hash": "hash1"
     },
     "user2": {
       "api_id": 67890,
       "api_hash": "hash2"
     }
   };
   ```

3. **User Setup**:
   - User provides their API credentials during registration
   - System stores credentials per user
   - Each user gets isolated API access

#### Benefits:
- ✅ Higher API limits per user
- ✅ Complete isolation
- ✅ Better for large teams
- ✅ Individual API management

#### Limitations:
- ⚠️ More complex setup
- ⚠️ Each user needs Telegram API access
- ⚠️ More backend configuration

## Current Implementation Status

### ✅ Already Working:
- **Multi-user support**: Each user has unique `userId`
- **Session isolation**: Separate session files per user
- **Channel management**: Users manage their own channels
- **Monitor processes**: Individual Telegram monitors per user

### 🔧 Needs Implementation (for real API):
- **API credential management**
- **Real Telegram API integration**
- **Session file management**
- **Error handling for API limits**

## Quick Start for New Users

### For the Admin:
1. **Set up API credentials** (if not in demo mode)
2. **Deploy the application**
3. **Share the URL** with users

### For Each User:
1. **Sign up** with email and password
2. **Log in** to the dashboard
3. **Connect Telegram**:
   - Click "Connect Telegram"
   - Enter phone number
   - Enter verification code
4. **Add channels**:
   - Select "Telegram" from dropdown
   - Enter channel name and URL
   - Click "Add Channel"

## File Structure for Multiple Users

```
sessions/
├── user1.session
├── user2.session
├── user3.session
└── ...

telegram_downloads/
├── user1/
│   └── telegram/
│       └── channel1/
│           └── video1.mp4
├── user2/
│   └── telegram/
│       └── channel2/
│           └── video2.mp4
└── ...
```

## API Limits and Considerations

### Telegram API Limits:
- **Rate limits**: 20 requests per minute per API
- **Session limits**: 1 session per phone number
- **Channel limits**: No hard limit on channels per user

### Recommendations:
- **Small teams (1-5 users)**: Use shared API credentials
- **Large teams (5+ users)**: Consider individual API credentials
- **Monitor usage**: Track API calls to avoid limits

## Security Considerations

### User Data Isolation:
- ✅ Each user's channels are separate
- ✅ Each user's downloads are isolated
- ✅ Each user's session is independent
- ✅ No cross-user data access

### API Security:
- 🔒 Store API credentials securely
- 🔒 Use environment variables for production
- 🔒 Implement proper authentication
- 🔒 Monitor for suspicious activity

## Troubleshooting

### Common Issues:
1. **"API credentials not found"**: Check telegram_config.json
2. **"Session expired"**: User needs to reconnect Telegram
3. **"Rate limit exceeded"**: Wait or use individual API credentials
4. **"Channel not found"**: Verify channel URL and permissions

### Debug Steps:
1. Check server logs for errors
2. Verify user session files exist
3. Test API credentials independently
4. Check Telegram API status

## Next Steps

To enable real Telegram API integration:

1. **Set DEMO_MODE = false** in server.js
2. **Add your API credentials** to telegram_config.json
3. **Test with one user** first
4. **Scale to multiple users** as needed

The system is already architected for multiple users - you just need to configure the real API credentials!



