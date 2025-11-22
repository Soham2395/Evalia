import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getUserDashboardStats, getPeerAverages, getInterviewsByUserId } from "@/lib/actions/general.action";
import DashboardStats from "@/components/DashboardStats";
import UserProfileCard from "@/components/UserProfileCard";
import PerformanceChart from "@/components/PerformanceChart";
import CategoryScoresChart from "@/components/CategoryScoresChart";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import InterviewTypeDistribution from "@/components/InterviewTypeDistribution";
import RecentInterviews from "@/components/RecentInterviews";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [userStats, peerStats, userInterviews] = await Promise.all([
    getUserDashboardStats(user.id),
    getPeerAverages(),
    getInterviewsByUserId(user.id),
  ]);

  if (!userStats) {
    return (
      <div className="w-full flex flex-col gap-8">
        <p className="text-light-100">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <>
      {/* Navigation */}
      <nav className="flex justify-between items-center p-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Evalia Logo" width={38} height={32} />
          <h2 className="text-primary-100 text-2xl font-bold">Evalia</h2>
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                {user.name?.charAt(0) || "U"}
              </div>
              <span className="text-light-100">{user.name || "User"}</span>
            </div>
            <LogoutButton />
          </div>
        )}
      </nav>

      <div className="root-layout">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/" 
              className="flex items-center gap-2 text-light-100/70 hover:text-primary-100 transition-colors mb-4"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-100 to-primary-200 bg-clip-text text-transparent">
              Your Dashboard
            </h1>
            <p className="text-light-100/70 mt-2">
              Track your progress and compare with peers
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <DashboardStats
          interviewsCreated={userStats.interviewsCreated}
          interviewsTaken={userStats.interviewsTaken}
          averageScore={userStats.averageScore}
          peerAverage={peerStats.averageScore}
        />

        {/* Profile, Recent Interviews, and Interview Types */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 items-stretch">
          <UserProfileCard user={user} />
          <RecentInterviews 
            interviews={userStats.allFeedbacks} 
            title="Recent Interviews"
          />
          <InterviewTypeDistribution interviews={userInterviews || []} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <PerformanceChart data={userStats.recentFeedbacks} />
          <CategoryScoresChart 
            userScores={userStats.categoryAverages}
            peerScores={peerStats.categoryAverages}
          />
        </div>

        {/* Category Breakdown */}
        {Object.keys(userStats.categoryAverages).length > 0 && (
          <div className="mt-8">
            <CategoryBreakdown categories={userStats.categoryAverages} />
          </div>
        )}

        {/* Insights Section */}
        {userStats.interviewsTaken > 0 && (
          <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 mt-8 overflow-hidden">
            <h3 className="text-xl font-semibold text-light-100 mb-4">Your Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-dark-300/50 rounded-lg p-4 overflow-hidden">
                <p className="text-light-100/70 text-sm mb-2">Performance Trend</p>
                <p className="text-light-100 text-lg font-semibold break-words">
                  {userStats.recentFeedbacks.length >= 2 ? (
                    userStats.recentFeedbacks[userStats.recentFeedbacks.length - 1].totalScore >
                    userStats.recentFeedbacks[userStats.recentFeedbacks.length - 2].totalScore ? (
                      <span className="text-success-100">📈 Improving</span>
                    ) : (
                      <span className="text-primary-100">📊 Stable</span>
                    )
                  ) : (
                    <span className="text-primary-100">🎯 Getting Started</span>
                  )}
                </p>
              </div>

              <div className="bg-dark-300/50 rounded-lg p-4 overflow-hidden">
                <p className="text-light-100/70 text-sm mb-2">vs Peers</p>
                <p className="text-light-100 text-lg font-semibold break-words">
                  {userStats.averageScore > peerStats.averageScore ? (
                    <span className="text-success-100">🏆 Above Average</span>
                  ) : userStats.averageScore === peerStats.averageScore ? (
                    <span className="text-primary-100">🎯 On Par</span>
                  ) : (
                    <span className="text-primary-200">💪 Room to Grow</span>
                  )}
                </p>
              </div>

              <div className="bg-dark-300/50 rounded-lg p-4 overflow-hidden">
                <p className="text-light-100/70 text-sm mb-2">Best Category</p>
                <p className="text-light-100 text-lg font-semibold break-words">
                  {Object.keys(userStats.categoryAverages).length > 0 ? (
                    <span className="text-primary-100">
                      {Object.entries(userStats.categoryAverages).reduce((a, b) => 
                        a[1] > b[1] ? a : b
                      )[0].replace(' Skills', '')}
                    </span>
                  ) : (
                    <span className="text-light-100/70">N/A</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        {userStats.interviewsTaken === 0 && (
          <div className="card-cta mt-8 overflow-hidden">
            <div className="flex flex-col gap-4 max-w-lg z-10">
              <h3 className="text-2xl font-bold text-primary-100 break-words">
                Ready to Start Your Journey?
              </h3>
              <p className="text-light-100 break-words">
                Take your first interview to see detailed analytics and track your progress over time.
              </p>
              <Link href="/" className="btn-primary w-fit">
                Browse Interviews
              </Link>
            </div>
            <Image
              src="/robot.png"
              alt="AI Interview Assistant"
              width={300}
              height={300}
              className="max-sm:hidden z-10 flex-shrink-0"
            />
          </div>
        )}
      </div>

      <footer className="mt-16 py-6 border-t border-dark-200 text-center text-light-100/50">
        <div className="container mx-auto">
          <p>© 2025 Evalia. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
