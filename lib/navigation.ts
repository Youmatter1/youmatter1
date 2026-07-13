// Navigation configurations for different dashboard types

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  match?: "exact" | "startswith";
}

export const adminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "dashboard",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "team",
  },
  {
    label: "Therapist Approvals",
    href: "/admin/therapist",
    icon: "doctor",
  },
  {
    label: "Testimonials",
    href: "/admin/testimonials",
    icon: "testimonials",
  },
];

export const therapistNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/clinician",
    icon: "dashboard",
  },
  {
    label: "My Sessions",
    href: "/clinician/sessions",
    icon: "clock",
  },
  {
    label: "Schedule",
    href: "/clinician/schedule",
    icon: "schedule",
  },
  {
    label: "My Patients",
    href: "/clinician/patients",
    icon: "team",
    match: "startswith",
  },
  {
    label: "Analytics",
    href: "/clinician/analytics",
    icon: "chart",
  },
  {
    label: "Messages",
    href: "/clinician/messages",
    icon: "chat",
  },
  {
    label: "My Profile",
    href: "/clinician/profile",
    icon: "user",
  },
];

export const orgAdminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/organization",
    icon: "dashboard",
  },
  {
    label: "Members",
    href: "/organization/members",
    icon: "team",
  },
  {
    label: "Analytics",
    href: "/organization/analytics",
    icon: "chart",
  },
  {
    label: "Settings",
    href: "/organization/settings",
    icon: "institution",
  },
  {
    label: "Billing",
    href: "/organization/billing",
    icon: "billing",
  },
];

export const patientNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/patient",
    icon: "dashboard",
  },
  {
    label: "Find Therapist",
    href: "/patient/find-therapist",
    icon: "doctor",
  },
  {
    label: "My Sessions",
    href: "/patient/sessions",
    icon: "clock",
  },
  {
    label: "Messages",
    href: "/patient/messages",
    icon: "chat",
  },
  {
    label: "Share Testimonial",
    href: "/testimonials",
    icon: "testimonials",
  },
];
