// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExtractPDFParams,
  ExtractElementType,
  ExtractPDFJob,
  ExtractPDFResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError
} = require("@adobe/pdfservices-node-sdk");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper function to log messages
function logMessage(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// PDF text extraction endpoint
app.post('/extract-text', async (req, res) => {
  const { pdfUrl } = req.body;
  
  if (!pdfUrl) {
    return res.status(400).json({ error: 'PDF URL is required' });
  }

  // Check if required environment variables are set
  if (!process.env.ADOBE_CLIENT_ID || !process.env.ADOBE_CLIENT_SECRET) {
    logMessage('Error: Adobe API credentials not found in environment variables');
    return res.status(500).json({ 
      success: false, 
      error: 'Adobe API credentials not configured' 
    });
  }

  let readStream = null;
  let tempFilePath = null;

  try {
    logMessage(`Starting PDF extraction from: ${pdfUrl}`);
    
    // Download the PDF from the provided URL
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF from ${pdfUrl}: ${pdfResponse.statusText}`);
    }
    
    const pdfBuffer = await pdfResponse.buffer();
    logMessage(`PDF downloaded successfully, size: ${pdfBuffer.length} bytes`);
    
    // Create a temporary file for the PDF
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, pdfBuffer);
    logMessage(`Created temporary file: ${tempFilePath}`);
    
    // Initial setup, create credentials instance using environment variables
    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.ADOBE_CLIENT_ID,
      clientSecret: process.env.ADOBE_CLIENT_SECRET
    });

    logMessage(`Created Adobe credentials with client ID: ${process.env.ADOBE_CLIENT_ID.substring(0, 8)}...`);

    // Creates a PDF Services instance
    const pdfServices = new PDFServices({credentials});
    logMessage(`Created PDF Services instance`);

    // Creates an asset(s) from source file(s) and upload
    readStream = fs.createReadStream(tempFilePath);
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF
    });
    
    logMessage(`PDF uploaded to Adobe successfully`);

    // Create parameters for the job
    const params = new ExtractPDFParams({
      elementsToExtract: [ExtractElementType.TEXT]
    });
    
    logMessage(`Created extraction parameters`);

    // Creates a new job instance
    const job = new ExtractPDFJob({inputAsset, params});
    logMessage(`Created extraction job`);

    // Submit the job and get the job result
    const pollingURL = await pdfServices.submit({job});
    logMessage(`Job submitted, polling URL: ${pollingURL}`);
    
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExtractPDFResult
    });
    
    logMessage(`Job completed successfully`);

    // Get content from the resulting asset(s)
    if (!pdfServicesResponse.result) {
      throw new Error("No result received from Adobe PDF Services");
    }
    
    const resultAsset = pdfServicesResponse.result.resource;
    const streamAsset = await pdfServices.getContent({asset: resultAsset});
    
    logMessage(`Got result asset content`);

    // Read the content as a ZIP file
    const chunks = [];
    return new Promise((resolve, reject) => {
      streamAsset.readStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      streamAsset.readStream.on('end', () => {
        try {
          const zipBuffer = Buffer.concat(chunks);
          logMessage(`Received ZIP file, size: ${zipBuffer.length} bytes`);
          
          // Extract the ZIP file
          const zip = new AdmZip(zipBuffer);
          const zipEntries = zip.getEntries();
          
          logMessage(`ZIP contains ${zipEntries.length} entries`);
          
          // Find the structuredData.json file
          const structuredDataEntry = zipEntries.find(entry => entry.entryName === 'structuredData.json');
          
          if (!structuredDataEntry) {
            throw new Error('structuredData.json not found in ZIP file');
          }
          
          // Parse the JSON data
          const jsonData = JSON.parse(structuredDataEntry.getData().toString('utf8'));
          logMessage(`Parsed JSON data successfully`);
          
          // Extract text content from the structured data
          let extractedText = '';
          
          if (jsonData.elements && Array.isArray(jsonData.elements)) {
            // Extract text from all elements
            jsonData.elements.forEach(element => {
              if (element.Text && element.Text.trim()) {
                extractedText += element.Text + ' ';
              }
            });
          }
          
          // If no text found in elements, try other properties
          if (!extractedText.trim() && jsonData.text) {
            extractedText = jsonData.text;
          }
          
          if (!extractedText.trim()) {
            // Fallback: try to extract any text content from the JSON
            extractedText = JSON.stringify(jsonData);
          }
          
          logMessage(`Successfully extracted text from PDF, length: ${extractedText.length}`);
          logMessage(`Extracted text preview: ${extractedText.slice(0, 500)}`);
          
          res.json({
            success: true,
            extractedText: extractedText.trim(),
            length: extractedText.length
          });
          resolve();
          
        } catch (error) {
          reject(new Error(`Failed to process ZIP file: ${error.message}`));
        }
      });
      
      streamAsset.readStream.on('error', (error) => {
        reject(new Error(`Failed to read extracted text: ${error.message}`));
      });
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logMessage(`PDF extraction failed: ${errorMessage}`);
    
    if (error instanceof SDKError || error instanceof ServiceUsageError || error instanceof ServiceApiError) {
      logMessage(`Adobe SDK error: ${error.message}`);
    }
    
    res.status(500).json({
      success: false,
      error: `PDF extraction failed: ${errorMessage}`
    });
  } finally {
    // Clean up resources
    if (readStream) {
      readStream.destroy();
    }
    
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        logMessage(`Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        logMessage(`Failed to clean up temporary file: ${cleanupError}`);
      }
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'PDF extraction server is running' });
});

app.listen(PORT, () => {
  console.log(`PDF extraction server running on port ${PORT}`);
}); 