"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";

type UserRole = "patient" | "therapist" | "org_admin";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const preSelectedRole: UserRole | undefined =
    roleParam === "patient" || roleParam === "therapist" || roleParam === "org_admin"
      ? roleParam
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join You Matter today</p>
        </div>
        <SignupForm preSelectedRole={preSelectedRole} />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SignupPageContent />
    </Suspense>
  );
}
