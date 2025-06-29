import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";
import fsPromises from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/actions/auth.action";
import fs from "fs";

// Helper function to append logs to a file
async function logToFile(message: string) {
  const logPath = path.join(process.cwd(), "logs", "api-vapi-generate.log");
  const timestamp = new Date().toISOString();
  try {
    await fsPromises.appendFile(logPath, `[${timestamp}] ${message}\n`);
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

// Helper function to extract text from PDF using the separate PDF server
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    await logToFile(`Starting PDF extraction from: ${pdfUrl}`);
    
    // Get PDF server URL from environment variable or use default
    const pdfServerUrl = process.env.PDF_SERVER_URL || process.env.NEXT_PUBLIC_PDF_SERVER_URL || 'http://localhost:3001';
    
    await logToFile(`Using PDF server URL: ${pdfServerUrl}`);
    
    // Call the separate PDF extraction server
    const response = await fetch(`${pdfServerUrl}/extract-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdfUrl })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PDF server error: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`PDF extraction failed: ${result.error}`);
    }
    
    await logToFile(`Successfully extracted text from PDF, length: ${result.length}`);
    await logToFile(`Extracted text preview: ${result.extractedText.slice(0, 500)}`);
    
    return result.extractedText;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToFile(`PDF extraction failed: ${errorMessage}`);
    throw new Error(`PDF extraction failed: ${errorMessage}`);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, role, level, techstack, amount, userid } = body;

  try {
    // Log the request body for debugging
    await logToFile(`Request body: ${JSON.stringify(body)}`);
    
    // Try to get user ID from session if not provided in request body
    let finalUserId = userid;
    if (!finalUserId) {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        finalUserId = currentUser.id;
        await logToFile(`Got user ID from session: ${finalUserId}`);
      }
    }
    
    // Validate input
    if (!type || !role || !level || !techstack || !amount || !finalUserId) {
      await logToFile(`Validation error: Missing required fields - type: ${type}, role: ${role}, level: ${level}, techstack: ${techstack}, amount: ${amount}, userid: ${finalUserId}`);
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields",
        missingFields: {
          type: !type,
          role: !role,
          level: !level,
          techstack: !techstack,
          amount: !amount,
          userid: !finalUserId
        }
      }, { status: 400 });
    }

    // Fetch user's resume from Firestore
    const userDoc = await db.collection("users").doc(finalUserId).get();
    let resumeText = "";
    let manualSkills = "";
    
    await logToFile(`User document exists: ${userDoc.exists}`);
    if (userDoc.exists) {
      const userData = userDoc.data();
      await logToFile(`User data keys: ${Object.keys(userData || {}).join(', ')}`);
      await logToFile(`Resume data: ${JSON.stringify(userData?.resume || 'No resume data')}`);
    }
    
    if (userDoc.exists && userDoc.data()?.resume?.url) {
      const resumeUrl = userDoc.data()?.resume.url;
      await logToFile(`Fetching resume from: ${resumeUrl}`);
      try {
        resumeText = await extractTextFromPDF(resumeUrl);
        await logToFile(`Successfully extracted resume text length: ${resumeText.length}`);
        await logToFile(`Resume text preview: ${resumeText.slice(0, 500)}`);
      } catch (pdfError) {
        await logToFile(`PDF parsing error: ${pdfError}`);
        manualSkills = userDoc.data()?.resume.manualSkills || "";
        resumeText = manualSkills;
        await logToFile(`Falling back to manualSkills: ${manualSkills}`);
      }
    } else {
      await logToFile(`No resume found for user: ${finalUserId}`);
      manualSkills = userDoc.data()?.resume?.manualSkills || "";
      resumeText = manualSkills;
      await logToFile(`Using manualSkills: ${manualSkills}`);
    }

    const prompt = `Prepare ${amount} questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus should lean towards ${type} questions (e.g., ${type === "technical" ? "technical questions about coding, tools, and frameworks" : "behavioral questions about teamwork, problem-solving, and leadership"}).
        The candidate's resume contains the following information: ${resumeText || "No resume or manual skills provided."}
        Instructions:
        - If resume information or manual skills are provided, generate at least 60% of the questions (rounded up) to directly reference specific skills, projects, or experiences from the resume. For example, if the resume mentions "Developed a dashboard using React and TypeScript," include questions like "Can you describe the challenges you faced while developing your React and TypeScript dashboard?" or "What specific TypeScript features did you use in your dashboard project?"
        - If no resume or manual skills are provided, generate generic questions relevant to the role, level, and tech stack, but prioritize specific, detailed questions over broad ones.
        - Ensure questions are clear, concise, and specific to the candidate's experience when possible.
        - Avoid generic questions unless no resume data is available.
        - Do not use special characters like "/", "*", or ">" that might break a voice assistant.
        - Return ONLY the questions as a valid JSON array. Do not include any markdown formatting, code blocks, or additional text.
        - The response must be a valid JSON array like this: ["Question 1", "Question 2", "Question 3"]
        
        Thank you!`;

    await logToFile(`Prompt sent to Gemini (first 1000 chars): ${prompt.slice(0, 1000)}`);
    
    try {
      const { text: questionsText } = await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt,
      });
      await logToFile(`Generated questions: ${questionsText}`);

      let questions: string[];
      try {
        // Clean up the response to remove markdown code blocks
        let cleanedText = questionsText.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '');
        }
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '');
        }
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.replace(/\s*```$/, '');
        }
        
        await logToFile(`Cleaned text: ${cleanedText}`);
        
        questions = JSON.parse(cleanedText);
        if (!Array.isArray(questions)) {
          throw new Error("Invalid questions format - not an array");
        }
        
        // Take only the first N questions as requested
        const requestedAmount = parseInt(amount);
        if (questions.length < requestedAmount) {
          throw new Error(`Not enough questions generated. Requested: ${requestedAmount}, Generated: ${questions.length}`);
        }
        
        // Trim to the requested amount
        questions = questions.slice(0, requestedAmount);
        await logToFile(`Using first ${requestedAmount} questions out of ${questions.length + requestedAmount - questions.length} generated`);
      } catch (parseError) {
        await logToFile(`Failed to parse questions: ${parseError}`);
        return NextResponse.json({ 
          success: false, 
          error: "Invalid question format",
          rawResponse: questionsText
        }, { status: 500 });
      }

      const interview = {
        role: role,
        type: type,
        level: level,
        techstack: techstack.split(",").map((tech: string) => tech.trim()),
        questions,
        userId: finalUserId,
        finalized: true,
        coverImage: getRandomInterviewCover(),
        createdAt: new Date().toISOString(),
      };

      await db.collection("interviews").add(interview);
      await logToFile(`Interview created for user ${finalUserId}: ${JSON.stringify(interview)}`);

      return NextResponse.json({ 
        success: true, 
        data: interview,
        message: "Interview questions generated successfully"
      }, { status: 200 });
      
    } catch (aiError) {
      await logToFile(`AI generation error: ${aiError}`);
      return NextResponse.json({ 
        success: false, 
        error: `AI generation failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToFile(`Error in /api/vapi/generate: ${errorMessage}`);
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Test PDF parsing functionality
  const { searchParams } = new URL(req.url);
  const testPdfUrl = searchParams.get('testPdfUrl');
  
  if (testPdfUrl) {
    try {
      await logToFile(`Testing PDF parsing with URL: ${testPdfUrl}`);
      const extractedText = await extractTextFromPDF(testPdfUrl);
      await logToFile(`Test successful! Extracted text length: ${extractedText.length}`);
      return NextResponse.json({ 
        success: true, 
        message: "PDF parsing test successful",
        extractedTextLength: extractedText.length,
        preview: extractedText.slice(0, 200)
      }, { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logToFile(`PDF parsing test failed: ${errorMessage}`);
      return NextResponse.json({ 
        success: false, 
        error: errorMessage 
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({ success: true, data: "Thank you!" }, { status: 200 });
}