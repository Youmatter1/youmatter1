/**
 * Validation Schemas using Zod
 * Comprehensive input validation for all API endpoints
 */

import { z } from 'zod';

// ==========================================
// Common Validation Rules
// ==========================================

const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  .trim();

const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL must not exceed 2048 characters')
  .optional();

// ==========================================
// Authentication Schemas
// ==========================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  // When present, the login must belong to exactly this role — lets the
  // account-type picker on the sign-in screen act as a real boundary rather
  // than a cosmetic label.
  role: z.enum(['patient', 'therapist', 'org_admin']).optional(),
});

export const registerPatientSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.literal('patient'),
  username: usernameSchema,
  full_name: nameSchema.optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  phone: phoneSchema,
  english_proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'fluent']).optional(),
});

export const registerTherapistSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.literal('therapist'),
  full_name: nameSchema,
  specialization: z.string()
    .min(2, 'Specialization must be at least 2 characters')
    .max(100, 'Specialization must not exceed 100 characters')
    .trim(),
  bio: z.string().max(1000, 'Bio must not exceed 1000 characters').optional(),
  years_of_experience: z.number().int().min(0).max(50).optional(),
  phone: phoneSchema,
  license_number: z.string().optional(),
  institution_name: z.string().optional(),
  country: z.string().optional(),
  contact_email: z.string().email('Invalid contact email').optional().or(z.literal('')),
  mission: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

export const registerOrgAdminSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.literal('org_admin'),
  organization_name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(200, 'Organization name must not exceed 200 characters')
    .trim(),
  domain: z.string().max(255, 'Domain must not exceed 255 characters').trim().optional(),
});

export const registerSchema = z.discriminatedUnion('role', [
  registerPatientSchema,
  registerTherapistSchema,
  registerOrgAdminSchema,
]);

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

// ==========================================
// User Profile Schemas
// ==========================================

export const updatePatientProfileSchema = z.object({
  full_name: nameSchema.optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  phone: phoneSchema,
  bio: z.string().max(1000, 'Bio must not exceed 1000 characters').optional(),
  english_proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'fluent']).optional(),
});

export const updateTherapistProfileSchema = z.object({
  full_name: nameSchema.optional(),
  specialization: z.string()
    .min(2, 'Specialization must be at least 2 characters')
    .max(100, 'Specialization must not exceed 100 characters')
    .optional(),
  bio: z.string().max(1000, 'Bio must not exceed 1000 characters').optional(),
  phone: phoneSchema,
  years_of_experience: z.number().int().min(0).max(50).optional(),
  consultation_fee: z.number().min(0).max(1000).optional(),
});

// ==========================================
// Education Content Schemas
// ==========================================

export const createResourceSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),
  content: z.string()
    .min(50, 'Content must be at least 50 characters')
    .max(50000, 'Content must not exceed 50000 characters'),
  category: z.string()
    .min(2, 'Category must be at least 2 characters')
    .max(50, 'Category must not exceed 50 characters')
    .trim(),
  tags: z.array(z.string().max(30, 'Each tag must not exceed 30 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  thumbnail_url: urlSchema,
  resource_type: z.enum(['article', 'video', 'audio', 'pdf', 'interactive']).default('article'),
  difficulty_level: z.enum(['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'proficient']).default('beginner'),
  is_published: z.boolean().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

// ==========================================
// Lesson/Session Schemas
// ==========================================

export const createLessonSchema = z.object({
  therapist_id: z.number().int().positive('Invalid therapist ID'),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  duration_minutes: z.number().int().min(30).max(180).default(60),
  notes: z.string()
    .max(1000, 'Notes must not exceed 1000 characters')
    .optional(),
  lesson_type: z.enum(['general', 'business', 'academic', 'conversation', 'test-prep'])
    .default('general'),
});

export const updateLessonSchema = z.object({
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show']),
  session_notes: z.string().max(2000, 'Session notes must not exceed 2000 characters').optional(),
  patient_feedback: z.string().max(500, 'Patient feedback must not exceed 500 characters').optional(),
  therapist_feedback: z.string().max(500, 'Therapist feedback must not exceed 500 characters').optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

// ==========================================
// Organization (B2B) Schemas
// ==========================================

export const inviteOrganizationMemberSchema = z.object({
  email: emailSchema,
  invite_role: z.enum(['therapist', 'member']).default('member'),
  name: nameSchema.optional(),
});

export const orgLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  slug: z.string().min(1, 'Organization is required'),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  name: nameSchema,
  password: passwordSchema,
  therapist_profile: z.object({
    specialization: z.string().min(2, 'Specialization must be at least 2 characters').max(100).trim(),
    license_number: z.string().optional(),
    years_of_experience: z.number().int().min(0).max(50).optional(),
    bio: z.string().max(1000, 'Bio must not exceed 1000 characters').optional(),
  }).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name must not exceed 200 characters').trim().optional(),
  domain: z.string().max(255, 'Domain must not exceed 255 characters').trim().optional(),
  logo_url: urlSchema,
  billing_email: z.string().email('Invalid billing email').optional().or(z.literal('')),
});

export const checkoutSchema = z.object({
  plan_tier: z.enum(['starter', 'growth', 'enterprise']),
  billing_cycle: z.enum(['monthly', 'annual']),
  seats: z.number().int().min(1, 'At least 1 seat is required').max(100000),
});

export const updateSeatsSchema = z.object({
  seats: z.number().int().min(1, 'At least 1 seat is required').max(100000),
});

// ==========================================
// Search/Filter Schemas
// ==========================================

export const searchTherapistsSchema = z.object({
  specialization: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_fee: z.number().min(0).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// ==========================================
// ID Schemas
// ==========================================

export const idSchema = z.object({
  id: z.number().int().positive('Invalid ID'),
});

export const stringIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(Number),
});

// ==========================================
// Helper Functions
// ==========================================

/**
 * Validate request body against a Zod schema
 * Returns validated data or throws with formatted errors
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((err) =>
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, errors: ['Invalid JSON in request body'] };
  }
}

/**
 * Sanitize string input to prevent XSS
 * Already using DOMPurify on client, but additional server-side sanitization
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate and sanitize HTML content
 * For content that may contain safe HTML
 */
export function sanitizeHtmlContent(content: string): string {
  // Remove script tags and dangerous content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
