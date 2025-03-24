"use client"; 

import { signOut } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const LogoutButton = () => {
  const handleLogout = async () => {
    await signOut();
    window.location.href = "/"; // Redirect after logout
  };

  return (
    <Button 
        variant="ghost" 
        size="icon" 
        className="text-light-100 hover:text-primary-100 hover:bg-dark-200 rounded-full" 
        onClick={handleLogout}
    >
        <LogOut size={20} />
        <span className="sr-only">Logout</span>
    </Button>
  );
};

export default LogoutButton;
