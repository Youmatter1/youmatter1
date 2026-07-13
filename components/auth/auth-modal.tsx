"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "signup";
  preSelectedRole?: 'patient' | 'therapist' | 'org_admin' | null;
}

export function AuthModal({ open, onOpenChange, initialMode = "login", preSelectedRole }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(preSelectedRole ? "signup" : initialMode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {mode === "login"
                ? "Welcome back to You Matter"
                : "Join You Matter to connect with therapists"}
            </p>
          </div>

          {mode === "login" && (
            <>
              <LoginForm preSelectedRole={preSelectedRole ? preSelectedRole : undefined} />
              <div className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold text-green-600 hover:text-green-700"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <>
              <SignupForm preSelectedRole={preSelectedRole ? preSelectedRole : undefined} />
              <div className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-semibold text-green-600 hover:text-green-700"
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
