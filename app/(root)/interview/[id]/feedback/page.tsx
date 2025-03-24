import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, RotateCw, Star, Calendar, Award, AlertCircle } from "lucide-react";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user?.id!,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-primary-200 hover:underline mb-4">
          <ArrowLeft className="mr-2" size={18} /> Back to Dashboard
        </Link>
        
        <div className="flex flex-col items-center text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-100 to-primary-200 bg-clip-text text-transparent">
            Interview Feedback Report
          </h1>
          <p className="text-light-400 mt-2 capitalize">
            {interview.role} Position • {interview.type} Interview
          </p>
        </div>

        {/* Score Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-dark-200 rounded-xl p-4 border border-primary-200/20">
            <div className="flex items-center gap-3">
              <div className="bg-primary-200/10 p-2 rounded-full">
                <Star className="text-primary-200" size={20} />
              </div>
              <div>
                <p className="text-light-400">Overall Score</p>
                <p className="text-2xl font-bold text-primary-200">
                  {feedback?.totalScore}
                  <span className="text-light-400 text-base">/100</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-dark-200 rounded-xl p-4 border border-primary-200/20">
            <div className="flex items-center gap-3">
              <div className="bg-primary-200/10 p-2 rounded-full">
                <Calendar className="text-primary-200" size={20} />
              </div>
              <div>
                <p className="text-light-400">Completed On</p>
                <p className="text-xl font-bold">
                  {feedback?.createdAt
                    ? dayjs(feedback.createdAt).format("MMM D, YYYY")
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Assessment */}
      <div className="bg-dark-200 rounded-xl p-6 mb-8 border border-primary-200/10">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="text-primary-200" size={20} /> Final Assessment
        </h2>
        <div className="bg-dark-300 rounded-lg p-4">
          <p className="text-light-100 leading-relaxed">{feedback?.finalAssessment}</p>
        </div>
      </div>

      {/* Interview Breakdown */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Interview Breakdown</h2>
        <div className="space-y-4">
          {feedback?.categoryScores?.map((category, index) => (
            <div key={index} className="bg-dark-200 rounded-lg p-4 border border-dark-300">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-primary-100">
                  {index + 1}. {category.name}
                </h3>
                <div className="flex items-center bg-primary-200/10 px-3 py-1 rounded-full">
                  <span className="text-primary-200 font-bold">{category.score}</span>
                  <span className="text-light-400 text-sm">/100</span>
                </div>
              </div>
              <p className="text-light-100">{category.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Strengths */}
        <div className="bg-dark-200 rounded-xl p-6 border border-success-100/20">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-success-100">
            <Award className="text-success-100" size={18} /> Key Strengths
          </h3>
          <ul className="space-y-3">
            {feedback?.strengths?.map((strength, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="bg-success-100/10 p-1 rounded-full mt-1">
                  <Award className="text-success-100" size={14} />
                </div>
                <span className="text-light-100">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-dark-200 rounded-xl p-6 border border-destructive-100/20">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-destructive-100">
            <AlertCircle className="text-destructive-100" size={18} /> Areas for Improvement
          </h3>
          <ul className="space-y-3">
            {feedback?.areasForImprovement?.map((area, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="bg-destructive-100/10 p-1 rounded-full mt-1">
                  <AlertCircle className="text-destructive-100" size={14} />
                </div>
                <span className="text-light-100">{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild className="btn-secondary flex-1 hover:scale-[1.02] transition-transform">
          <Link href="/" className="flex items-center justify-center gap-2">
            <ArrowLeft size={18} /> Back to Dashboard
          </Link>
        </Button>
        
        <Button asChild className="btn-primary flex-1 hover:scale-[1.02] transition-transform">
          <Link href={`/interview/${id}`} className="flex items-center justify-center gap-2">
            <RotateCw size={18} /> Retake Interview
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Feedback;