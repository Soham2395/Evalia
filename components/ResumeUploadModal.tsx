"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Sparkles } from "lucide-react";

export default function ResumeUploadModal() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        alert("Resume uploaded successfully! Generating personalized interview questions...");
        setShowUploadModal(false);
        setFile(null);
        // Optionally refresh the page or update state to show new interviews
        window.location.reload();
      } else {
        setError(result.error || "Upload failed");
      }
    } catch (err) {
      setError("An error occurred while uploading");
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setFile(null);
    setError(null);
  };

  return (
    <>
      <Button 
        onClick={() => setShowUploadModal(true)}
        className="bg-dark-200/80 hover:bg-dark-200 text-light-100 border border-primary-100/30 hover:border-primary-100/50 hover:scale-105 transition-all"
      >
        <Upload size={18} className="mr-2" /> Upload Resume
      </Button>

      {/* Upload Resume Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-100 rounded-2xl p-6 w-full max-w-md border border-dark-200/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-light-100">Upload Your Resume</h3>
              <Button
                onClick={closeModal}
                variant="ghost"
                size="sm"
                className="text-light-100/70 hover:text-light-100 p-1"
              >
                <X size={20} />
              </Button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm text-light-100/70">
                  Select PDF file (Max 10MB)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full p-3 border border-dark-200/50 rounded-lg bg-dark-200/30 text-light-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-100 file:text-dark-100 file:font-medium hover:file:bg-primary-200 transition-colors"
                  />
                </div>
                {file && (
                  <p className="text-sm text-primary-100">
                    Selected: {file.name}
                  </p>
                )}
              </div>
              
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  onClick={closeModal}
                  variant="outline"
                  className="flex-1 border-dark-200/50 text-light-100/70 hover:text-light-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Upload Resume
                    </>
                  )}
                </Button>
              </div>
            </form>
            
            <div className="mt-4 p-3 bg-primary-100/10 border border-primary-100/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-primary-100 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-light-100/70">
                  Our AI will analyze your resume and create personalized interview questions based on your experience and skills.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}