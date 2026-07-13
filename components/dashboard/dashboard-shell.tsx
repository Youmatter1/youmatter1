"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  RiDashboard3Line,
  RiTeamLine,
  RiStackLine,
  RiBuildingLine,
  RiFileTextLine,
  RiUserHeartLine,
  RiCalendarScheduleLine,
  RiChatSmile3Line,
  RiHeartsLine,
  RiBookOpenLine,
  RiUserLine,
  RiArticleLine,
  RiStarLine,
} from "react-icons/ri";
import { CreditCard } from "lucide-react";
import type { NavItem } from "@/lib/navigation";

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  navItems?: NavItem[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: RiDashboard3Line,
  team: RiTeamLine,
  performance: RiStackLine,
  institution: RiBuildingLine,
  docs: RiFileTextLine,
  doctor: RiUserHeartLine,
  schedule: RiCalendarScheduleLine,
  chat: RiChatSmile3Line,
  community: RiHeartsLine,
  learn: RiBookOpenLine,
  user: RiUserLine,
  blogs: RiArticleLine,
  testimonials: RiStarLine,
  billing: CreditCard,
};

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
  breadcrumbs,
  navItems,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full gap-6 px-2 py-4 sm:px-6 sm:py-10 lg:px-8">
        {navItems && navItems.length ? (
          <aside className="hidden w-full max-w-[240px] rounded-3xl border border-black/20 bg-white/80 p-6 shadow-[0_30px_90px_-65px_rgba(0,0,0,0.2)] lg:block">
            <div className="mb-6">
              <Link
                href="/"
                className="flex items-center gap-3 text-sm font-semibold text-black"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">UM</span>
                </div>
                You Matter
              </Link>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon ? iconMap[item.icon] : null;
                const matchType = item.match ?? "startswith";
                const isActive =
                  matchType === "exact"
                    ? pathname === item.href
                    : pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      isActive
                        ? "bg-black text-white shadow-[0_20px_60px_-45px_rgba(0,0,0,0.4)]"
                        : "text-black/70 hover:bg-black/5",
                    )}
                  >
                    {Icon ? <Icon className="h-5 w-5" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-10 pt-4 border-t border-black/10">
              <button
                onClick={logout}
                className="flex w-full items-center justify-center rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
              >
                Logout
              </button>
            </div>
          </aside>
        ) : null}
        <div className="flex-1 min-w-0">
          <header className="mb-6 flex flex-col gap-6 rounded-2xl bg-white px-4 py-5 shadow-[0_35px_80px_-60px_rgba(0,0,0,0.2)] sm:mb-8 sm:gap-4 sm:rounded-3xl sm:px-8 sm:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                {breadcrumbs && breadcrumbs.length ? (
                  <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={crumb.label} className="flex items-center gap-2">
                        {crumb.href ? (
                          <Link
                            href={crumb.href}
                            className="transition hover:text-black"
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-black">{crumb.label}</span>
                        )}
                        {index < breadcrumbs.length - 1 ? (
                          <span className="text-black/30">/</span>
                        ) : null}
                      </span>
                    ))}
                  </nav>
                ) : null}
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="text-sm text-black/70">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              {actions ? (
                <div className="flex flex-wrap items-center gap-3">{actions}</div>
              ) : null}
            </div>
            {navItems && navItems.length ? (
              <div className="-mx-1 -mb-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {navItems.map((item) => {
                  const Icon = item.icon ? iconMap[item.icon] : null;
                  const matchType = item.match ?? "startswith";
                  const isActive =
                    matchType === "exact"
                      ? pathname === item.href
                      : pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex min-w-max items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition",
                        isActive
                          ? "bg-black text-white shadow-[0_20px_60px_-45px_rgba(0,0,0,0.4)]"
                          : "bg-white/60 text-black/70 hover:bg-white",
                      )}
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  onClick={logout}
                  className="flex min-w-max items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </header>
          <main className={cn("space-y-8 pb-16")}>{children}</main>
        </div>
      </div>
    </div>
  );
}