import { FileText, CheckCircle, TrendingUp, Users } from "lucide-react";

interface DashboardStatsProps {
  interviewsCreated: number;
  interviewsTaken: number;
  averageScore: number;
  peerAverage: number;
}

export default function DashboardStats({ 
  interviewsCreated, 
  interviewsTaken, 
  averageScore,
  peerAverage 
}: DashboardStatsProps) {
  const scoreDiff = averageScore - peerAverage;
  const isAboveAverage = scoreDiff > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Interviews Created */}
      <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 hover:border-primary-100/30 transition-all hover:scale-105">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100/20 flex items-center justify-center text-primary-100">
            <FileText size={24} />
          </div>
        </div>
        <p className="text-3xl font-bold text-primary-100">{interviewsCreated}</p>
        <p className="text-light-100/70 mt-1">Interviews Created</p>
      </div>

      {/* Interviews Taken */}
      <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 hover:border-primary-100/30 transition-all hover:scale-105">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-success-100/20 flex items-center justify-center text-success-100">
            <CheckCircle size={24} />
          </div>
        </div>
        <p className="text-3xl font-bold text-success-100">{interviewsTaken}</p>
        <p className="text-light-100/70 mt-1">Interviews Taken</p>
      </div>

      {/* Average Score */}
      <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 hover:border-primary-100/30 transition-all hover:scale-105">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary-200/20 flex items-center justify-center text-primary-200">
            <TrendingUp size={24} />
          </div>
        </div>
        <p className="text-3xl font-bold text-primary-200">{averageScore}/100</p>
        <p className="text-light-100/70 mt-1">Your Average Score</p>
      </div>

      {/* Peer Comparison */}
      <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 hover:border-primary-100/30 transition-all hover:scale-105">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-light-400/20 flex items-center justify-center text-light-400">
            <Users size={24} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-light-400">{peerAverage}/100</p>
          {interviewsTaken > 0 && (
            <span className={`text-sm font-semibold ${isAboveAverage ? 'text-success-100' : 'text-destructive-100'}`}>
              {isAboveAverage ? '+' : ''}{scoreDiff}
            </span>
          )}
        </div>
        <p className="text-light-100/70 mt-1">Peer Average</p>
      </div>
    </div>
  );
}
