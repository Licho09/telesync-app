# Supabase Authentication Setup Guide

## Quick Setup Steps

### 1. Create your .env file
Copy the example environment file:
```bash
cp env.example .env
```

### 2. Get your Supabase credentials
1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **anon public** key

### 3. Configure your .env file
Edit your `.env` file and replace the placeholder values:

```env
# Replace these with your actual Supabase credentials
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 4. Configure Authentication Providers (Optional)

#### For Google OAuth:
1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials

#### For Email Authentication:
1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your email templates and SMTP settings

### 5. Test the Setup
1. Start your development server: `npm run dev`
2. Go to the login page
3. You should see "✅ Real Authentication: Supabase configured" instead of demo mode
4. Try signing in with email or Google

## Troubleshooting

### Still seeing "Demo Mode"?
- Check that your `.env` file exists and has the correct values
- Make sure you're not using the placeholder values from `env.example`
- Restart your development server after changing `.env`

### Authentication not working?
- Check the browser console for error messages
- Verify your Supabase URL and key are correct
- Make sure your Supabase project is active and not paused

### Google OAuth not working?
- Ensure Google provider is enabled in Supabase
- Check that your redirect URLs are configured correctly
- Verify your Google OAuth credentials are correct

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_TELEGRAM_BOT_TOKEN` | Telegram bot token (optional) | `1234567890:ABC...` |

## Security Notes

- Never commit your `.env` file to version control
- The `VITE_SUPABASE_ANON_KEY` is safe to use in frontend code
- For production, set these variables in your hosting platform's environment settings
