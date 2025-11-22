import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import FilteredInterviewsSection from "@/components/FilteredInterviewsSection";
import { Mic2, Sparkles, BarChart2, Clock, Users, FileText, Upload, LayoutDashboard } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";
import ResumeUploadModal from "@/components/ResumeUploadModal";

async function Home() {
  const user = await getCurrentUser();

  const [userInterviews, allInterview] = await Promise.all([
    getInterviewsByUserId(user?.id!),
    getLatestInterviews({ userId: user?.id! }),
  ]);

  // Sections now handle their own empty states and pagination

  return (
    <>
      <nav className="flex justify-between items-center p-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
          <h2 className="text-primary-100 text-2xl font-bold">Evalia</h2>
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <Button asChild className="btn-secondary !min-h-9">
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard size={18} />
                <span className="max-sm:hidden">Dashboard</span>
              </Link>
            </Button>
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

      <section className="card-cta relative overflow-hidden">
        <div className="flex flex-col gap-6 max-w-lg z-10">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-100 to-primary-200 bg-clip-text text-transparent">
            Create Your Perfect Interview Experience
          </h2>
          <p className="text-lg text-light-100">
            Design custom interviews, upload your resume for personalized questions, and practice with AI-powered feedback
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="btn-primary hover:scale-105 transition-transform">
              <Link href="/interview" className="flex items-center gap-2">
                <FileText size={18} /> Create Your Own Interview
              </Link>
            </Button>
            <ResumeUploadModal />
          </div>

          <div className="flex items-center gap-2 text-sm text-light-100/70">
            <Sparkles size={16} className="text-primary-100" />
            <span>AI analyzes your resume to create tailored interview questions</span>
          </div>
        </div>

        <Image
          src="/robot.png"
          alt="AI Interview Assistant"
          width={400}
          height={400}
          className="max-sm:hidden z-10"
        />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-100 rounded-full filter blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-200 rounded-full filter blur-3xl"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 text-center transform transition-all hover:scale-105 hover:bg-dark-200 border border-dark-100/20 hover:border-primary-100/30">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-100/20 flex items-center justify-center text-primary-100">
              <FileText size={24} />
            </div>
            <p className="text-primary-100 text-3xl font-bold mb-1">100+</p>
            <p className="text-light-100/70">Interview Questions</p>
          </div>
          <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 text-center transform transition-all hover:scale-105 hover:bg-dark-200 border border-dark-100/20 hover:border-primary-100/30">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-100/20 flex items-center justify-center text-primary-100">
              <Upload size={24} />
            </div>
            <p className="text-primary-100 text-3xl font-bold mb-1">100+</p>
            <p className="text-light-100/70">Users</p>
          </div>
          <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 text-center transform transition-all hover:scale-105 hover:bg-dark-200 border border-dark-100/20 hover:border-primary-100/30">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-100/20 flex items-center justify-center text-primary-100">
              <BarChart2 size={24} />
            </div>
            <p className="text-primary-100 text-3xl font-bold mb-1">AI</p>
            <p className="text-light-100/70">Detailed Feedback</p>
          </div>
          <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 text-center transform transition-all hover:scale-105 hover:bg-dark-200 border border-dark-100/20 hover:border-primary-100/30">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-100/20 flex items-center justify-center text-primary-100">
              <Clock size={24} />
            </div>
            <p className="text-primary-100 text-3xl font-bold mb-1">24/7</p>
            <p className="text-light-100/70">Always Available</p>
          </div>
        </div>
      </section>

      <FilteredInterviewsSection
        title="Your Interviews"
        interviews={userInterviews}
        userId={user?.id}
      />

      <FilteredInterviewsSection
        title="Take Interviews"
        interviews={allInterview}
        userId={user?.id}
      />
      
      <footer className="mt-16 py-6 border-t border-dark-200 text-center text-light-100/50">
        <div className="container mx-auto">
          <p>© 2025 Evalia. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default Home;