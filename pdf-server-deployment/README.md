# PDF Server Deployment

This is a separate deployment for the PDF extraction server that uses Adobe PDF Services SDK.

## Files Included:
- `pdf-server.js` - Main PDF extraction server
- `vercel.json` - Vercel configuration
- `package.json` - Dependencies
- `node_modules/` - All required packages
- `temp/` - Directory for temporary files
- `env.example` - Environment variables template

## Deployment Steps:

1. **Set Environment Variables in Vercel Dashboard:**
   - `ADOBE_CLIENT_ID` - Your Adobe client ID
   - `ADOBE_CLIENT_SECRET` - Your Adobe client secret
   - `ADOBE_ORGANIZATION_ID` - Your Adobe organization ID

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Get the deployment URL** and update your main app's `PDF_SERVER_URL` environment variable.

## Testing:
```bash
curl -X POST https://your-pdf-server.vercel.app/extract-text \
  -H "Content-Type: application/json" \
  -d '{"pdfUrl": "https://example.com/test.pdf"}'
```

## Architecture:
This server runs independently from the main Next.js app and handles:
- PDF download from URLs
- Adobe PDF Services integration
- ZIP file parsing
- Text extraction and cleaning
- JSON response formatting 