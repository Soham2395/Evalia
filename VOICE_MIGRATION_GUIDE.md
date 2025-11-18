# Voice Service Migration Guide

## What Changed

You've successfully migrated from Vapi to a custom Go microservice for voice handling. Here's what's new:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (components/Agent.tsx)                             │
│  - Captures mic audio via getUserMedia                      │
│  - WebSocket connection to voice service                    │
│  - Displays transcripts and plays TTS audio                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket (audio + control)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Voice Service (Go) - voice-service/                        │
│  - WebSocket server (port 8080)                             │
│  - AssemblyAI streaming STT                                 │
│  - ElevenLabs TTS                                           │
│  - Dialog FSM for collecting interview parameters           │
│  - POST to main app when complete                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Main Next.js App (Vercel)                                  │
│  - POST /api/vapi/generate (unchanged)                      │
│  - Firestore, Gemini, PDF extraction                        │
└─────────────────────────────────────────────────────────────┘
```

### Files Changed

**New Files:**
- `voice-service/` - Complete Go microservice
  - `main.go` - WebSocket server
  - `session.go` - Session management
  - `dialog.go` - Dialog state machine
  - `assemblyai.go` - STT client
  - `elevenlabs.go` - TTS client
  - `generate.go` - HTTP client for main app
- `lib/voice-client.ts` - Browser WebSocket client

**Modified Files:**
- `components/Agent.tsx` - Uses VoiceClient instead of Vapi
- `env.example` - Added NEXT_PUBLIC_VOICE_SERVICE_URL

**Unchanged:**
- `app/api/vapi/generate/route.ts` - Still handles interview generation
- All Firestore/Firebase logic
- All UI components

## Setup Instructions

### 1. Set Up Voice Service

```bash
cd voice-service

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Required:
# - ASSEMBLYAI_API_KEY (get from https://www.assemblyai.com/)
# - ELEVENLABS_API_KEY (get from https://elevenlabs.io/)
# - MAIN_APP_URL (your Next.js app URL)
```

### 2. Get API Keys

**AssemblyAI:**
1. Sign up at https://www.assemblyai.com/
2. Go to Dashboard → API Keys
3. Copy your API key

**ElevenLabs:**
1. Sign up at https://elevenlabs.io/
2. Go to Profile → API Keys
3. Copy your API key
4. (Optional) Get a voice ID from Voices page

### 3. Run Voice Service Locally

```bash
cd voice-service

# Install dependencies
go mod download

# Run the service
go run .
```

Service will start on `http://localhost:8080`

Test health endpoint:
```bash
curl http://localhost:8080/health
```

### 4. Configure Main App

In your main app's `.env.local`:

```bash
# For local development
NEXT_PUBLIC_VOICE_SERVICE_URL=ws://localhost:8080/voice

# For production (after deploying voice service)
# NEXT_PUBLIC_VOICE_SERVICE_URL=wss://your-voice-service.fly.dev/voice
```

### 5. Run Main App

```bash
# In the main project directory
npm run dev
```

### 6. Test the Integration

1. Navigate to your interview page
2. Click "Call" button
3. Allow microphone access
4. Speak your answers to the prompts
5. The agent will:
   - Ask for role, type, level, tech stack, amount
   - Generate interview via your existing API
   - Confirm completion

## Deployment

### Deploy Voice Service to Fly.io (Recommended)

```bash
cd voice-service

# Install flyctl
brew install flyctl  # or curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (creates fly.toml)
fly launch

# Set secrets
fly secrets set ASSEMBLYAI_API_KEY=your-key
fly secrets set ELEVENLABS_API_KEY=your-key
fly secrets set MAIN_APP_URL=https://evalia-tau.vercel.app
fly secrets set ALLOWED_ORIGINS=https://evalia-tau.vercel.app

# Deploy
fly deploy
```

Your service will be at `wss://your-app-name.fly.dev/voice`

### Deploy Voice Service to Railway

```bash
cd voice-service

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Set environment variables in Railway dashboard
# Then deploy
railway up
```

### Update Main App Environment

After deploying voice service, update your main app's environment:

**Vercel:**
1. Go to your project settings
2. Environment Variables
3. Add/update: `NEXT_PUBLIC_VOICE_SERVICE_URL=wss://your-voice-service.fly.dev/voice`
4. Redeploy

## Troubleshooting

### Voice service won't start
- Check Go version: `go version` (need 1.21+)
- Verify .env file exists and has API keys
- Check port 8080 is not in use: `lsof -i :8080`

### Can't connect from browser
- Ensure voice service is running
- Check NEXT_PUBLIC_VOICE_SERVICE_URL is set correctly
- For local dev, use `ws://` not `wss://`
- Check browser console for WebSocket errors

### AssemblyAI errors
- Verify API key is correct
- Check account has available credits
- Ensure sample rate is 16000 Hz

### ElevenLabs errors
- Verify API key is correct
- Check account has available characters
- Try default voice ID if custom one fails

### Interview not generating
- Check voice service logs for POST errors
- Verify MAIN_APP_URL is correct
- Ensure /api/vapi/generate endpoint is accessible
- Check main app logs on Vercel

### Audio quality issues
- AssemblyAI expects 16kHz mono audio
- Check microphone permissions in browser
- Try different browser if issues persist

## Benefits of This Migration

✅ **Full Control**: Own your voice pipeline, no vendor lock-in
✅ **Cost Effective**: Pay only for STT/TTS usage, no platform fees
✅ **Customizable**: Modify dialog flow, add features easily
✅ **Debuggable**: Full access to logs and metrics
✅ **Scalable**: Deploy to edge, scale independently
✅ **Reliable**: No third-party workflow dependencies

## Next Steps

- [ ] Deploy voice service to production
- [ ] Update main app environment variables
- [ ] Test end-to-end in production
- [ ] Monitor logs and performance
- [ ] (Optional) Add phone support via Twilio
- [ ] (Optional) Add multi-language support
- [ ] (Optional) Implement custom TTS voices

## Rollback Plan

If you need to rollback to Vapi:

1. Uncomment Vapi env vars in `.env.local`
2. In `components/Agent.tsx`, revert to using `vapi` import
3. Restore original `handleCall` logic
4. Redeploy

The `/api/vapi/generate` endpoint is unchanged, so both systems can coexist during migration.
