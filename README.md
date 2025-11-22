# Evalia (AI Mock Interviews)

Evalia is an AI-powered mock interview platform built with Next.js. It lets users generate interviews, practice across multiple categories (Technical, Behavioral, Mixed), and receive automated feedback with scores and actionable insights.

The app includes a home dashboard, interview generation via an AI Agent, rich interview cards with feedback and tech badges, and a smooth, sectioned listing experience with a View all / View less interaction.

## Features

- **Interview generation**: Create interview sessions tailored to your role and tech stack.
- **AI feedback**: Automatic scoring, strengths, areas for improvement, and final assessment.
- **Sectioned interview listings**: Your Interviews and Take Interviews, split into Technical, Behavioral, and Mixed.
- **Smooth View all**: Expand/collapse additional cards per section without page jumps.
- **Resume upload**: Upload a PDF resume for tailored questions. Requires the PDF server microservice.
- **Auth and user context**: User-aware listings and feedback.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Lucide icons
- **UI/UX**: Custom components, hover/scale transitions, smooth expand animations
- **AI**: `ai` SDK + `@ai-sdk/google` (Gemini)
- **Data**: Firebase Admin (Firestore)
- **Media**: Cloudinary (for tech icons/images if configured)
- **Voice Service**: Go microservice (WebSocket) using AssemblyAI (STT) + ElevenLabs (TTS)
- **PDF Server**: Node + Express + `@adobe/pdfservices-node-sdk`

## Required Services

This project depends on two external services that MUST be running and configured for full functionality:

1) **Voice Service (Go microservice)**
   - Purpose: Real-time voice sessions for the Agent. Handles STT (AssemblyAI), TTS (ElevenLabs), dialog orchestration, and interview generation triggers to the main app.
   - Source: `voice-service/`
   - Default port: `8080`
   - Endpoints:
     - `GET /health` – Health check
     - `WS /voice` – WebSocket endpoint for live sessions
   - Environment variables (in `voice-service/.env`):
     - `ASSEMBLYAI_API_KEY` – AssemblyAI key
     - `ELEVENLABS_API_KEY` – ElevenLabs key
     - `ELEVENLABS_VOICE_ID` – Optional (defaults internally if not set)
     - `MAIN_APP_URL` – Public URL of this Next.js app (used to POST `/api/vapi/generate`)
     - `ALLOWED_ORIGINS` – Comma-separated origins for CORS (e.g., `http://localhost:3000`)

   Quick start:
   ```bash
   cd voice-service
   cp .env.example .env # if present; otherwise create .env with the variables above
   go mod download
   go run .
   # Service at http://localhost:8080
   ```

   Docker build/run:
   ```bash
   docker build -t evalia-voice-service ./voice-service
   docker run --rm -p 8080:8080 --env-file ./voice-service/.env evalia-voice-service
   ```

   Architecture overview:
   ```
   Browser (Agent.tsx)
       ↓ WebSocket
   Voice Service (Go)
       ├─ AssemblyAI (STT)
       ├─ ElevenLabs (TTS)
       └─ POST → Main App (/api/vapi/generate)
   ```

2) **PDF Server (Node microservice)**
   - Purpose: Extracts and cleans text from uploaded PDF resumes using Adobe PDF Services. The main app calls this to tailor interview questions.
   - Source: `pdf-server-deployment/`
   - Typical endpoint (example): `POST /extract-text` with `{ pdfUrl: "..." }`
   - Environment variables (in `pdf-server-deployment/.env` or platform env):
     - `ADOBE_CLIENT_ID`
     - `ADOBE_CLIENT_SECRET`
     - `ADOBE_ORGANIZATION_ID` (or `ADOBE_ORG_ID` depending on your setup)
     - `ADOBE_ACCOUNT_ID` (if required by your credentials)
     - `ADOBE_PRIVATE_KEY_PATH` – Path to the private key (e.g., `./private.key`)
     - `PORT` – Server port (e.g., `5050`)

   Quick start (local):
   ```bash
   cd pdf-server-deployment
   npm install
   npm start # or node server.js / node index.js depending on your entry
   # Server at http://localhost:5050 (adjust per your env)
   ```

   Vercel deployment (from `pdf-server-deployment/README.md`):
   ```bash
   vercel --prod
   ```
   Then configure the main app to call that deployed URL.

## Repository Layout

```
ai_mock_interviews-main/
├─ app/                 # Next.js App Router (pages, layouts)
├─ components/          # Reusable UI & sections
├─ lib/                 # Server actions, utilities
├─ public/              # Static assets
├─ pdf-server-deployment/ # PDF server microservice (required)
├─ voice-service/       # Optional voice service (Dockerized)
├─ package.json         # Root scripts & dependencies
└─ README.md            # This file
```

Key components to know:
- `components/InterviewCard.tsx` – Server Component rendering a single interview; fetches feedback.
- `components/FilteredInterviewsSection.tsx` – Groups interviews by type and renders sections.
- `components/RevealToggle.tsx` – Client control to smoothly expand/collapse extra cards.
- `app/(root)/page.tsx` – Home dashboard; shows Your Interviews and Take Interviews.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm, npm, or yarn
- Firebase project (Firestore)
- Google API key for Gemini (via `@ai-sdk/google`)
- (Optional) Cloudinary account for images
- (Optional) Adobe PDF Services credentials (for the PDF helper server)

### Install dependencies

```bash
# with npm
npm install

# or with pnpm
yarn install
# or
pnpm install
```

### Environment Variables (Main App)

Create a `.env.local` in the project root for the Next.js app. The exact names depend on your configuration. Here are typical variables used by this codebase and related services:

```bash
# Firebase Admin (Service Account)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
# Wrap the private key in quotes and replace literal \n with actual newlines if needed
FIREBASE_PRIVATE_KEY=

# AI / Google Gemini
GOOGLE_API_KEY=

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Public keys (if any UI needs them)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# Voice Service
# URL to your running voice-service (used by the front-end to open WS or by APIs to call into it)
VOICE_SERVICE_URL=http://localhost:8080

# PDF Server
# Base URL to your PDF server microservice used for resume extraction
PDF_SERVER_URL=http://localhost:5050

# Vapi (if you integrate @vapi-ai/web flows)
VAPI_API_KEY=
NEXT_PUBLIC_VAPI_API_KEY=

# Any additional NEXT_PUBLIC_* values needed by the UI
```

If you plan to run the PDF helper server, add an `.env` inside `pdf-server-deployment/` with your Adobe credentials, e.g.:

```bash
# pdf-server-deployment/.env
ADOBE_CLIENT_ID=
ADOBE_CLIENT_SECRET=
ADOBE_ORG_ID=
ADOBE_ACCOUNT_ID=
ADOBE_PRIVATE_KEY_PATH=./private.key
PORT=5050
```

### Run the app (Next.js)

```bash
# Dev server
npm run dev

# Production build
npm run build
npm start
```

The app uses App Router. Default dev URL is http://localhost:3000

### PDF server (required)

There are two ways to run the PDF server (depending on your setup):

Inside `pdf-server-deployment/` (recommended)
```bash
cd pdf-server-deployment
npm install
npm start
# or: node server.js / node index.js (depends on your entry file)
```

Make sure to configure the `.env` in that folder and the port it listens on.

### Voice service (required)

You must run the Go voice-service. Either run locally or deploy with Docker/Railway/Fly. Update `VOICE_SERVICE_URL` and `ALLOWED_ORIGINS` accordingly so the browser can connect over WebSocket.

## Development Notes

- **Server components**: `InterviewCard` is a Server Component that calls server actions to fetch feedback. When adding client-side interactions around it, keep the data-fetching in the server boundary and wrap UI-only behavior in separate client components.
- **Animations**: The section expansion uses CSS grid row transitions via `components/RevealToggle.tsx`. Tune durations/easings there.
- **Styling**: Tailwind CSS 4 is used. Global utility classes and component classes are referenced across components (e.g., `interviews-section`, `card-cta`).
- **Linting**: `npm run lint` uses Next.js ESLint config.

## Main App Integration

- **Voice → Main App**: The voice-service posts to the main app endpoint `POST /api/vapi/generate` to create an interview after collecting role, type, level, tech stack, and number of questions.
- **Main App → PDF Server**: The main app calls the PDF server at `PDF_SERVER_URL` to extract text from resumes (e.g., `POST /extract-text` with `{ pdfUrl }`), using the result to tailor interview questions.

## Deployment

- **Vercel**: This app is Next.js 15 and works well on Vercel.
  - Set Environment Variables in your Project Settings.
  - Add any external services (Firebase, Cloudinary, etc.).
- **Other platforms**: Use Node 18+ runtime with `npm run build` → `npm start`.

## Troubleshooting

- **Feedback not showing on cards**: Ensure `feedback` collection exists in Firestore and server credentials are correct. `getFeedbackByInterviewId()` requires both `interviewId` and `userId` to match a document.
- **Google AI calls failing**: Verify `GOOGLE_API_KEY` and model name in `lib/actions/general.action.ts` (Gemini 2.0 Flash).
- **Private key issues**: Make sure your Firebase private key newlines are preserved. In some environments you must replace `\n` with actual line breaks.
- **Broken images/icons**: If you use Cloudinary, ensure `getTechLogos()` and `getRandomInterviewCover()` mappings are valid and credentials are set.

## Scripts

- **dev** – `next dev --turbopack`
- **build** – `next build`
- **start** – `next start`
- **lint** – `next lint`
- **pdf-server** – `node pdf-server.js` (if present in root)

## License

Proprietary. All rights reserved.
