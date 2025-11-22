import Link from "next/link";
import dayjs from "dayjs";
import { ArrowRight, Calendar, Star } from "lucide-react";
import { Button } from "./ui/button";

interface RecentInterviewsProps {
  interviews: Array<{
    id: string;
    interviewId: string;
    totalScore: number;
    createdAt: string;
  }>;
  title: string;
}

export default function RecentInterviews({ interviews, title }: RecentInterviewsProps) {
  return (
    <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 h-full flex flex-col">
      <h3 className="text-xl font-semibold text-light-100 mb-6">{title}</h3>
      
      {interviews.length > 0 ? (
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px]">
          {interviews.slice(0, 5).map((interview) => (
            <Link
              key={interview.id}
              href={`/interview/${interview.interviewId}/feedback`}
              className="block"
            >
              <div className="bg-dark-300/50 rounded-lg p-4 border border-dark-100/10 hover:border-primary-100/30 transition-all hover:bg-dark-300">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-light-100/70">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="flex-shrink-0" />
                        <span className="whitespace-nowrap">{dayjs(interview.createdAt).format('MMM D, YYYY')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-primary-100 flex-shrink-0" />
                        <span className="text-primary-100 font-semibold whitespace-nowrap">
                          {interview.totalScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-light-100/50 flex-shrink-0" />
                </div>
              </div>
            </Link>
          ))}
          
          {interviews.length > 5 && (
            <Button className="btn-secondary w-full mt-4">
              View All Interviews
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
          <p className="text-light-100/70 mb-4">No interviews taken yet.</p>
          <Button asChild className="btn-primary">
            <Link href="/">Take Your First Interview</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
