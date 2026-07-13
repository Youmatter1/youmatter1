export const COLORS = {
  backgroundDeep: "#596ee5ff",
  backgroundMid: "#595bcaff",
  backgroundLight: "#95a3ccff",
  cardBackground: "#596ee5ff",
  surface: "#596ee5ff",
  textPrimary: "#000000ff",
  textSecondary: "#000000ff",
  accent: "#596ee5ff",
  accentDark: "#000000ff",
  highlight: "#b8bcf0ff",
  chipActive: "#3a436aff",
  chipInactive: "#d5d6e9ff",
} as const;

export const FONT_FAMILY = {
  primary: "Poppins, var(--font-geist-sans), system-ui, sans-serif",
};

// Platform information
export const PLATFORM = {
  name: "YouMatter",
  tagline: "You don't have to heal alone",
  description: "Connecting you with compassionate therapists for personalized mental health support. Your journey to wellness starts here.",
} as const;

// User roles
export const ROLES = {
  patient: 'patient',
  therapist: 'therapist',
  admin: 'admin',
} as const;

export const SOCIAL_LINKS = [
  { name: 'X', href: 'https://x.com/youmatter' },
  { name: 'Instagram', href: 'https://instagram.com/youmatter' },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/youmatter' },
] as const;




export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#why" },
  { label: "Testimonials", href: "#community" },
  { label: "For Organizations", href: "/for-organizations" },
  { label: "Login", href: "/login" },
] as const;



