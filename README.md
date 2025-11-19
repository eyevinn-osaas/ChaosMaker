# Chaos Stream Proxy Configurator

A web-based configuration tool for managing [Eyevinn Chaos Stream Proxy](https://github.com/Eyevinn/chaos-stream-proxy) instances in Eyevinn Open Source Cloud (OSC).

## Overview

The Chaos Stream Proxy Configurator provides an intuitive UI for creating and managing chaos configurations for testing video streaming resilience. Test how your video players handle various network conditions and stream corruption scenarios including delays, timeouts, throttling, and HTTP error codes.

## Features

- 📝 **Configuration Management**: Create, edit, duplicate, and delete chaos proxy configurations
- 🎯 **Multiple Targeting Modes**: Target segments by index, sequence number, bitrate, or apply to all segments
- 🌐 **OSC Integration**: Manage chaos proxy instances directly from OSC
- 🔄 **Live Updates**: Real-time URL generation for both direct proxy and redirect URLs
- 📋 **Example Configurations**: 16 pre-configured examples from the Chaos Stream Proxy documentation
- 🔐 **Secure Token Management**: Built-in OSC Personal Access Token configuration
- 🎨 **User-Friendly Interface**: Clean, modern UI with helpful validation and error messages

## Prerequisites

- Node.js 18+ and npm
- [OSC CLI](https://github.com/Eyevinn/osc-cli) installed globally (for OSC instance management)
- OSC Personal Access Token (get from [https://app.osaas.io/personal-access-token](https://app.osaas.io/personal-access-token))

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd ChaosMaker

# Install dependencies
npm install
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server port
PORT=3001

# Public URL configuration (for deployment)
# Leave commented for local development
# PUBLIC_PROTOCOL=https
# PUBLIC_HOSTNAME=my-app.example.com
# PUBLIC_PORT=443
```

### Example Configurations

The project includes example configurations in `chaos-configs.example.json`. Copy this file to `chaos-configs.json` to start with examples:

```bash
cp chaos-configs.example.json chaos-configs.json
```

## Development

Run both frontend and backend in development mode:

```bash
# Terminal 1: Start backend server
npm run dev:server

# Terminal 2: Start frontend dev server
npm run dev
```

Or run both concurrently:

```bash
npm run dev:all
```

The application will be available at:
- Frontend: http://localhost:5173 (or next available port)
- Backend API: http://localhost:3001

## Production Build

```bash
# Build frontend
npm run build

# Build backend
npm run build:server

# Start production server
npm run start:server
```

## Project Structure

```
ChaosMaker/
├── src/                      # Frontend source code
│   ├── components/           # React components
│   │   ├── ConfigurationManager.tsx   # Main configuration list & editor
│   │   ├── StreamConfig.tsx           # Source URL and protocol settings
│   │   ├── ChaosConfig.tsx            # Chaos corruption configuration
│   │   └── UrlGenerator.tsx           # URL display and save functionality
│   ├── services/             # API client services
│   ├── types.ts              # TypeScript type definitions
│   └── App.tsx               # Main application component
├── server/                   # Backend Express server
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic
│   │   ├── configStore.ts    # Configuration persistence
│   │   └── oscClient.ts      # OSC CLI integration
│   └── index.ts              # Server entry point
├── public/                   # Static assets
│   └── favicon.svg           # Application icon
├── chaos-configs.json        # User configurations (auto-generated)
└── chaos-configs.example.json # Example configurations

```

## Usage

### 1. Configure OSC Token (Optional)

If you want to manage OSC instances:
1. Click "Create New" or "Change Proxy"
2. Select "OSC Instances" tab
3. Enter your OSC Personal Access Token
4. Click "Save Token & Load Instances"

### 2. Create a Configuration

1. Click "Create New" button
2. Select or enter a Chaos Stream Proxy instance URL
3. Configure source stream URL and protocol (HLS or DASH)
4. Add chaos corruptions (delays, timeouts, status codes, throttling)
5. Enter a configuration name and optional description
6. Click "Save Configuration"

### 3. Use Generated URLs

After saving, you'll receive two URLs:

- **Direct Proxy URL**: Full URL with all corruption parameters embedded
- **Redirect URL**: Short URL that redirects to the proxy URL (updates when you modify the config)

### Targeting Modes

Control which segments are affected by corruptions:

- **None**: Exclude from wildcard targeting
- **All Segments (*)**: Apply to every segment
- **Specific Index (i)**: Target by segment index (0-based)
- **Media Sequence (sq)**: Target by media sequence number (live streams)
- **Relative Sequence (rsq)**: Target relative to current position (stateful mode only)
- **Bitrate (br)**: Target segments at specific bitrate
- **Playlist Ladder (l)**: Target specific quality ladder (HLS delays only)

### Corruption Types

#### Delays
Add latency to segment requests:
- `ms`: Delay in milliseconds

#### Status Codes
Return HTTP error codes instead of segments:
- `code`: HTTP status code (e.g., 404, 500)

#### Timeouts
Cause request to hang/timeout:
- No additional parameters needed

#### Throttling
Limit download bandwidth:
- `rate`: Bytes per second

## API Endpoints

### Configuration Management

- `GET /api/config` - List all configurations
- `GET /api/config/:name/:protocol` - Get specific configuration
- `POST /api/config` - Save configuration
- `DELETE /api/config/:name/:protocol` - Delete configuration

### Instance Management

- `GET /api/chaos-proxy/instances` - List OSC instances
- `POST /api/chaos-proxy/instances` - Create new instance
- `DELETE /api/chaos-proxy/instances/:name` - Delete instance
- `POST /api/chaos-proxy/validate` - Validate proxy URL

### Authentication

- `POST /api/auth/token` - Set OSC access token
- `GET /api/auth/token/status` - Check if token is configured
- `DELETE /api/auth/token` - Clear access token

### Redirects

- `GET /redirect/:name.m3u8` - Redirect to HLS proxy URL
- `GET /redirect/:name.mpd` - Redirect to DASH proxy URL

## Troubleshooting

### "Authorization token is invalid"

Your OSC Personal Access Token is incorrect or expired:
1. Click "Clear Token" button
2. Generate a new token from [https://app.osaas.io/personal-access-token](https://app.osaas.io/personal-access-token)
3. Enter the new token and click "Save Token & Load Instances"

### "Failed to validate proxy URL"

The chaos proxy instance may not be running or accessible:
1. Verify the URL is correct
2. Check if the instance is running in OSC
3. Try accessing the URL directly in your browser

### Port Already in Use

If port 3001 or 5173 is already in use:
- Change `PORT` in `.env` for backend
- Frontend will automatically use next available port

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style and conventions
- All TypeScript types are properly defined
- Backend changes include proper error handling
- UI changes maintain consistent design

## License

[Add your license here]

## Acknowledgments

- Built for [Eyevinn Technology](https://www.eyevinn.se/)
- Uses [Chaos Stream Proxy](https://github.com/Eyevinn/chaos-stream-proxy)
- Deployed on [Eyevinn Open Source Cloud](https://www.osaas.io/)
