"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/auth-modal";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [preSelectedRole, setPreSelectedRole] = useState<'patient' | 'therapist' | 'org_admin' | null>(null);

  return (
    <header className="sticky top-6 z-50 flex justify-center px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 rounded-3xl border border-black/20 bg-gradient-to-r from-white/65 via-white/90 to-white/65 px-8 py-4 text-sm text-black shadow-[0_40px_90px_-70px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all duration-300">
        <Link
          href="/"
          className="flex items-center gap-3 text-base font-semibold tracking-tight"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">UM</span>
          </div>
          You Matter
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-black/70 lg:flex">
          {NAV_LINKS.filter((link) => link.label !== "Login").map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/donate"
            className="rounded-full px-5 py-2 text-sm font-semibold text-black/70 transition hover:text-black"
          >
            Donate
          </Link>
          <Link
            href="/login"
            className="rounded-full px-5 py-2 text-sm font-semibold text-black/70 transition hover:text-black"
          >
            Log In
          </Link>
          <button
            onClick={() => {
              setPreSelectedRole(null);
              setAuthModalOpen(true);
            }}
            className={buttonVariants({ variant: "secondary" })}
          >
            Sign Up
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-black/70 transition hover:text-black"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 mt-4 px-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-3xl border border-black/20 bg-white p-6 shadow-xl backdrop-blur-2xl">
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-black/70 hover:bg-black/5 hover:text-black transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/donate"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-black/70 hover:bg-black/5 hover:text-black transition-colors"
              >
                Donate
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-black/70 hover:bg-black/5 hover:text-black transition-colors"
              >
                Log In
              </Link>
              <button
                onClick={() => {
                  setPreSelectedRole(null);
                  setAuthModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-black/70 hover:bg-black/5 hover:text-black transition-colors text-left w-full"
              >
                Sign Up
              </button>
            </nav>
          </div>
        </div>
      )}

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        initialMode="signup"
        preSelectedRole={preSelectedRole}
      />
    </header>
  );
}
