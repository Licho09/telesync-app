# TeleSync - Telegram Video Downloader

A comprehensive Telegram video downloader automation tool with a stunning landing page and simplified login interface. The app automates video downloads from Telegram channels, featuring a modern dashboard that demonstrates the automated workflow.

## Features

- 🎯 **Automated Downloads**: Videos start downloading the moment they're posted to monitored Telegram channels
- 📁 **Smart Organization**: Files are automatically sorted into custom folder structures
- ⚡ **Real-time Updates**: Live progress tracking and status updates via WebSocket
- 🔐 **Secure Authentication**: Google OAuth and email-based authentication via Supabase
- 📊 **Dashboard Analytics**: Track downloads, storage usage, and time saved
- 🎨 **Modern UI**: Clean, Tailscale-inspired design with responsive layout

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Supabase** for authentication
- **React Hot Toast** for notifications
- **Lucide React** for icons

### Backend
- **Express.js** server
- **WebSocket** for real-time updates
- **CORS** enabled for cross-origin requests

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install server dependencies**
   ```bash
   npm install express cors ws concurrently
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Telegram Bot Configuration (optional for demo)
   VITE_TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   
   # API Configuration
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_WS_URL=ws://localhost:3001/ws
   ```

5. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev:full
   
   # Or start them separately:
   # Terminal 1: Backend server
   npm run server
   
   # Terminal 2: Frontend development server
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173` to see the application.

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx      # Main dashboard with channel and download management
│   ├── LandingPage.tsx    # Marketing landing page
│   └── LoginPage.tsx      # Authentication page
├── contexts/
│   └── AuthContext.tsx    # Authentication context and Supabase integration
├── services/
│   ├── apiService.ts      # API client and WebSocket service
│   └── telegramService.ts # Telegram Bot API integration
├── App.tsx                # Main app component with routing
└── main.tsx               # Application entry point

server.js                  # Express.js backend server
```

## Usage

### 1. Landing Page
- View the marketing page showcasing TeleSync's features
- Click "Get started" or "Log in" to proceed to authentication

### 2. Authentication
- **Google OAuth**: Click "Sign in with Google" for OAuth authentication
- **Email**: Enter your email to receive a magic link
- Both methods redirect to the dashboard upon successful authentication

### 3. Dashboard
- **Add Channels**: Click "Add Channel" to monitor new Telegram channels
- **Monitor Downloads**: View real-time download progress and status
- **Manage Storage**: Track storage usage and organize files
- **Real-time Updates**: See live updates via WebSocket connection

## API Endpoints

The backend server provides the following endpoints:

### Channels
- `GET /api/channels` - Get all monitored channels
- `POST /api/channels` - Add a new channel
- `PUT /api/channels/:id` - Update channel settings
- `DELETE /api/channels/:id` - Remove a channel
- `PATCH /api/channels/:id/toggle` - Toggle channel active status

### Downloads
- `GET /api/downloads` - Get download history
- `GET /api/downloads/:id` - Get specific download details
- `POST /api/downloads/:id/retry` - Retry failed download
- `DELETE /api/downloads/:id` - Remove download record
- `GET /api/downloads/stats` - Get download statistics

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/usage` - Get usage statistics

## WebSocket Events

The server broadcasts real-time updates via WebSocket:

- `channels_update` - Channel list changes
- `downloads_update` - Download progress updates
- `download_complete` - Download completion notifications

## Development

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start Express.js backend server
- `npm run dev:full` - Start both frontend and backend concurrently
- `npm run lint` - Run ESLint

### Adding New Features

1. **Frontend Components**: Add new React components in `src/components/`
2. **API Integration**: Extend `src/services/apiService.ts` for new endpoints
3. **Backend Routes**: Add new routes in `server.js`
4. **Real-time Updates**: Use WebSocket service for live data

## Production Deployment

### Frontend (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting platform
3. Set environment variables in your hosting platform

### Backend (Railway/Heroku)
1. Deploy `server.js` to your hosting platform
2. Set environment variables
3. Update `VITE_API_BASE_URL` and `VITE_WS_URL` in frontend

## Configuration

### Supabase Setup
1. Create a new Supabase project
2. Enable Google OAuth in Authentication settings
3. Add your domain to allowed origins
4. Copy the URL and anon key to environment variables

### Telegram Bot Setup (Optional)
1. Create a bot via @BotFather on Telegram
2. Get the bot token
3. Add the token to environment variables
4. Configure webhook for production use

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@telesync.com or create an issue in the repository.


