"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { VoiceClient } from "@/lib/voice-client";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [voiceClient, setVoiceClient] = useState<VoiceClient | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (voiceClient) {
        voiceClient.disconnect();
      }
    };
  }, [voiceClient]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("Generating feedback for", messages.length, "messages");

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        // Interview generated via microservice; return user to home
        setTimeout(() => router.push("/"), 3000);
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    try {
      console.log("Starting call with type:", type);
      setCallStatus(CallStatus.CONNECTING);
      setErrorMessage("");

      // Validate environment variable
      const voiceServiceUrl = process.env.NEXT_PUBLIC_VOICE_SERVICE_URL;
      if (!voiceServiceUrl) {
        throw new Error("Voice service URL not configured. Set NEXT_PUBLIC_VOICE_SERVICE_URL in your environment.");
      }

      // Create voice client
      const client = new VoiceClient({
        url: voiceServiceUrl,
        onTranscript: (transcript, role, isFinal) => {
          if (isFinal) {
            setMessages((prev) => [...prev, { role, content: transcript }]);
          }
        },
        onPrompt: (content) => {
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 2000);
        },
        onError: (error) => {
          console.error("Voice error:", error);
          setErrorMessage(error);
          setCallStatus(CallStatus.ERROR);
        },
        onDone: () => {
          console.log("Call completed");
          setCallStatus(CallStatus.FINISHED);
        },
        onConnectionChange: (connected) => {
          if (connected) {
            setCallStatus(CallStatus.ACTIVE);
          }
        },
      });

      setVoiceClient(client);

      // Connect to voice service
      await client.connect(
        userName,
        userId!,
        type === "generate" ? "generate" : "interview",
        questions
      );

      // Start recording
      await client.startRecording();

      console.log("Call started successfully");
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus(CallStatus.ERROR);
      setErrorMessage(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnect = () => {
    console.log("Manually disconnecting call");
    if (voiceClient) {
      voiceClient.disconnect();
    }
    setCallStatus(CallStatus.FINISHED);
  };

  const handleRetry = () => {
    if (voiceClient) {
      voiceClient.disconnect();
      setVoiceClient(null);
    }
    setCallStatus(CallStatus.INACTIVE);
    setErrorMessage("");
    setMessages([]);
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-center">{errorMessage}</p>
          <button 
            onClick={handleRetry}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg mx-auto block"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus === CallStatus.ERROR ? (
          <button className="btn-call" onClick={handleRetry}>
            Try Again
          </button>
        ) : callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
