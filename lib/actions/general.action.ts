"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  // Fetch latest finalized interviews ordered by createdAt desc.
  // Avoid Firestore inequality-ordering constraints by NOT using "!= userId" here.
  // We'll exclude the current user's interviews in memory after fetching.
  const snapshot = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .orderBy("createdAt", "desc")
    // Slightly overfetch to compensate for client-side filtering of current user
    .limit(limit * 2)
    .get();

  const all = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];

  // Filter out current user's interviews and cap to requested limit.
  // If any legacy docs are missing createdAt, push them to the end deterministically.
  const sanitized = all
    .filter((i) => i.userId !== userId)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime; // desc
    })
    .slice(0, limit);

  return sanitized;
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getUserDashboardStats(userId: string) {
  try {
    // Get all user's interviews
    const userInterviews = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .get();

    // Get all user's feedback
    const userFeedback = await db
      .collection("feedback")
      .where("userId", "==", userId)
      .get();

    const interviews = userInterviews.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];

    const feedbacks = userFeedback.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Feedback[];

    // Calculate statistics
    const interviewsCreated = interviews.length;
    const interviewsTaken = feedbacks.length;
    
    const totalScore = feedbacks.reduce((sum, f) => sum + (f.totalScore || 0), 0);
    const averageScore = feedbacks.length > 0 ? Math.round(totalScore / feedbacks.length) : 0;

    // Get category averages
    const categoryAverages: { [key: string]: number } = {};
    if (feedbacks.length > 0) {
      feedbacks.forEach((feedback) => {
        feedback.categoryScores?.forEach((cat) => {
          if (!categoryAverages[cat.name]) {
            categoryAverages[cat.name] = 0;
          }
          categoryAverages[cat.name] += cat.score;
        });
      });
      
      Object.keys(categoryAverages).forEach((key) => {
        categoryAverages[key] = Math.round(categoryAverages[key] / feedbacks.length);
      });
    }

    // Performance over time (last 10 interviews)
    const recentFeedbacks = feedbacks
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-10);

    return {
      interviewsCreated,
      interviewsTaken,
      averageScore,
      categoryAverages,
      recentFeedbacks,
      allFeedbacks: feedbacks,
    };
  } catch (error) {
    console.error("Error getting user dashboard stats:", error);
    return null;
  }
}

export async function getPeerAverages() {
  try {
    // Get all feedback from all users
    const allFeedback = await db.collection("feedback").get();

    const feedbacks = allFeedback.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Feedback[];

    if (feedbacks.length === 0) {
      return {
        averageScore: 0,
        categoryAverages: {},
        totalUsers: 0,
      };
    }

    // Calculate peer averages
    const totalScore = feedbacks.reduce((sum, f) => sum + (f.totalScore || 0), 0);
    const averageScore = Math.round(totalScore / feedbacks.length);

    // Get category averages
    const categoryAverages: { [key: string]: number } = {};
    feedbacks.forEach((feedback) => {
      feedback.categoryScores?.forEach((cat) => {
        if (!categoryAverages[cat.name]) {
          categoryAverages[cat.name] = 0;
        }
        categoryAverages[cat.name] += cat.score;
      });
    });

    Object.keys(categoryAverages).forEach((key) => {
      categoryAverages[key] = Math.round(categoryAverages[key] / feedbacks.length);
    });

    // Get unique users count
    const uniqueUsers = new Set(feedbacks.map((f) => f.userId));

    return {
      averageScore,
      categoryAverages,
      totalUsers: uniqueUsers.size,
    };
  } catch (error) {
    console.error("Error getting peer averages:", error);
    return {
      averageScore: 0,
      categoryAverages: {},
      totalUsers: 0,
    };
  }
}

export async function updateUserProfile(userId: string, data: { name?: string }) {
  try {
    await db.collection("users").doc(userId).update(data);
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false };
  }
}
