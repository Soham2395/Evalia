# Deployment Guide for AI Mock Interviews

This project consists of two separate servers that need to be deployed to Vercel:

## 1. Main Next.js Application

### Deployment Steps:
1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project settings in Vercel
   - Add all variables from your `.env.local` file
   - **Important:** Add `PDF_SERVER_URL` pointing to your PDF server deployment

### Environment Variables Needed:
```
NEXT_PUBLIC_VAPI_WEB_TOKEN
NEXT_PUBLIC_VAPI_WORKFLOW_ID
GOOGLE_GENERATIVE_AI_API_KEY
NEXT_PUBLIC_BASE_URL
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
PDF_SERVER_URL=https://your-pdf-server.vercel.app
```

## 2. PDF Server (Separate Deployment)

### Deployment Steps:
1. **Create a new Vercel project for the PDF server:**
   ```bash
   # Create a new directory for PDF server
   mkdir pdf-server-deployment
   cd pdf-server-deployment
   
   # Copy PDF server files
   cp ../pdf-server.js .
   cp ../pdf-server-vercel.json ./vercel.json
   cp ../package.json .
   cp -r ../node_modules .
   cp -r ../temp .
   ```

2. **Deploy PDF server:**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables for PDF Server:**
   ```
   ADOBE_CLIENT_ID=your-adobe-client-id
   ADOBE_CLIENT_SECRET=your-adobe-client-secret
   ADOBE_ORGANIZATION_ID=your-adobe-organization-id
   ```

### Alternative: Deploy from Subdirectory
You can also deploy the PDF server directly from the main project:

```bash
# Deploy PDF server from current directory
vercel --prod --config pdf-server-vercel.json
```

## 3. Update PDF Server URL

After deploying the PDF server, update the `PDF_SERVER_URL` in your main app's environment variables to point to the PDF server's Vercel URL.

## 4. Testing

1. **Test PDF Server:**
   ```bash
   curl -X POST https://your-pdf-server.vercel.app/extract-text \
     -H "Content-Type: application/json" \
     -d '{"pdfUrl": "https://example.com/test.pdf"}'
   ```

2. **Test Main App:**
   - Navigate to your main app URL
   - Try creating an interview with a resume upload

## Architecture Overview

```
┌─────────────────┐    HTTP Request    ┌─────────────────┐
│   Next.js App   │ ──────────────────► │   PDF Server    │
│   (Port 3000)   │                    │   (Port 3001)   │
│                 │                    │                 │
│ - Interview UI  │                    │ - Adobe SDK     │
│ - AI Generation │                    │ - PDF Parsing   │
│ - Firebase DB   │                    │ - ZIP Handling  │
└─────────────────┘                    └─────────────────┘
```

## Troubleshooting

1. **PDF Server Not Responding:**
   - Check if Adobe credentials are correct
   - Verify the PDF server URL in main app environment variables
   - Check Vercel function logs

2. **PDF Extraction Failing:**
   - Ensure Adobe API quota is not exceeded
   - Check if PDF URL is accessible
   - Verify ZIP file handling in PDF server

3. **Environment Variables:**
   - Make sure all variables are set in Vercel dashboard
   - Check for typos in variable names
   - Ensure PDF_SERVER_URL points to correct deployment 