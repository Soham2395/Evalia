# Voice Service (Go Microservice)

WebSocket-based voice service for real-time interview generation using AssemblyAI (STT) and ElevenLabs (TTS).

## Architecture

```
Browser (Agent.tsx)
    ↓ WebSocket
Voice Service (Go)
    ├─ AssemblyAI (STT)
    ├─ ElevenLabs (TTS)
    └─ POST → Main App (/api/vapi/generate)
```

## Features

- Real-time speech-to-text via AssemblyAI
- Text-to-speech via ElevenLabs
- Dialog state machine for collecting interview parameters
- WebSocket communication with browser
- Automatic interview generation via main app API

## Setup

### 1. Install Dependencies

```bash
cd voice-service
go mod download
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required variables:
- `ASSEMBLYAI_API_KEY` - Get from https://www.assemblyai.com/
- `ELEVENLABS_API_KEY` - Get from https://elevenlabs.io/
- `ELEVENLABS_VOICE_ID` - Optional, defaults to Rachel voice
- `MAIN_APP_URL` - Your main Next.js app URL
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

### 3. Run Locally

```bash
go run .
```

The service will start on `http://localhost:8080`

## API Endpoints

### Health Check
```
GET /health
```

Returns service status.

### Voice WebSocket
```
WS /voice
```

WebSocket endpoint for voice sessions.

## WebSocket Protocol

### Client → Server Messages

**Start Session:**
```json
{
  "type": "start",
  "username": "John Doe",
  "userid": "firebase-user-id",
  "mode": "generate"
}
```

**Send Audio:**
```json
{
  "type": "audio",
  "audio": [base64-encoded-audio-bytes]
}
```

**Stop Session:**
```json
{
  "type": "stop"
}
```

### Server → Client Messages

**Transcript (Partial):**
```json
{
  "type": "transcript_partial",
  "transcript": "Hello...",
  "role": "user"
}
```

**Transcript (Final):**
```json
{
  "type": "transcript",
  "transcript": "Hello there",
  "role": "user"
}
```

**Prompt (Agent Speaking):**
```json
{
  "type": "prompt",
  "content": "What role would you like to train for?",
  "role": "assistant"
}
```

**Audio (TTS):**
```json
{
  "type": "audio",
  "audio": [mp3-audio-bytes]
}
```

**Error:**
```json
{
  "type": "error",
  "error": "Error message"
}
```

**Done:**
```json
{
  "type": "done"
}
```

## Dialog Flow (Generate Mode)

1. **Ask Role**: "What role would you like to train for?"
2. **Ask Type**: "Are you aiming for a technical, behavioral, or mixed interview?"
3. **Ask Level**: "What is the job experience level required?"
4. **Ask Tech Stack**: "What technologies should we cover?"
5. **Ask Amount**: "How many questions would you like?"
6. **Generate**: POST to main app `/api/vapi/generate`
7. **Confirm**: "Your interview has been generated successfully!"

## Deployment

### Railway

```bash
railway login
railway init
railway up
```

### Fly.io

```bash
fly auth login
fly launch
fly deploy
```

### Docker

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o voice-service .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/voice-service .
EXPOSE 8080
CMD ["./voice-service"]
```

## Testing

### Test Health Endpoint
```bash
curl http://localhost:8080/health
```

### Test WebSocket (using wscat)
```bash
npm install -g wscat
wscat -c ws://localhost:8080/voice
```

Then send:
```json
{"type":"start","username":"Test User","userid":"test123","mode":"generate"}
```

## Troubleshooting

### AssemblyAI Connection Issues
- Verify API key is correct
- Check network/firewall settings
- Ensure sample rate is 16000 Hz

### ElevenLabs TTS Issues
- Verify API key and voice ID
- Check API quota/limits
- Try default voice ID if custom one fails

### Main App Integration Issues
- Verify MAIN_APP_URL is correct
- Check CORS settings in ALLOWED_ORIGINS
- Ensure /api/vapi/generate endpoint is accessible

## Performance

- Handles multiple concurrent WebSocket connections
- Low-latency audio streaming
- Efficient goroutine-based concurrency
- Minimal memory footprint

## Security

- API keys stored server-side only
- CORS validation on WebSocket upgrade
- No sensitive data logged
- Environment-based configuration
