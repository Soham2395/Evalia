"use client";

import { useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import { Button } from "./ui/button";
import { updateUserProfile } from "@/lib/actions/general.action";
import { toast } from "sonner";

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function UserProfileCard({ user }: UserProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsLoading(true);
    const result = await updateUserProfile(user.id, { name: name.trim() });
    setIsLoading(false);

    if (result.success) {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } else {
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setIsEditing(false);
  };

  return (
    <div className="bg-dark-200/80 backdrop-blur-sm rounded-2xl p-6 border border-dark-100/20 h-full min-h-[360px] flex flex-col hover:border-primary-100/30 transition-all">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-light-100">Profile Information</h3>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="btn-secondary !min-h-8 !px-3 flex-shrink-0"
          >
            <Edit2 size={16} />
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-dark-100 text-4xl font-bold flex-shrink-0 mb-4 shadow-lg">
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Always show summary to keep header height consistent */}
        <h4 className="text-light-100 text-xl font-semibold break-words mb-1">
          {name}
        </h4>
        <p className="text-light-100/70 text-sm break-all">{user.email}</p>
      </div>

      {isEditing && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          <div>
            <label className="text-light-100/70 text-sm mb-2 block font-medium">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dark-300 text-light-100 rounded-lg px-4 py-2.5 border border-dark-100/20 focus:border-primary-100/50 focus:outline-none transition-colors"
              disabled={isLoading}
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="text-light-100/70 text-sm mb-2 block font-medium">
              Email Address
            </label>
            <div className="w-full bg-dark-300/50 text-light-100/50 rounded-lg px-4 py-2.5 border border-dark-100/10">
              {user.email}
            </div>
            <p className="text-light-100/50 text-xs mt-1">Email cannot be changed</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="btn-primary !min-h-10 flex-1 sm:flex-initial"
            >
              <Save size={16} className="mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              className="btn-secondary !min-h-10 flex-1 sm:flex-initial"
            >
              <X size={16} className="mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
