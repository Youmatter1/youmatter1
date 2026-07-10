import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// protection mapping
const protectedRoutes = {
  '/admin': ['admin'],
  '/patient': ['patient'],
  '/clinician': ['therapist'],
  '/organization': ['org_admin'],
};

// routes with authentication
const authRequiredRoutes = ['/admin', '/patient', '/clinician', '/organization'];

// routes with no authentication
const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/education', '/testimonials', '/api-docs', '/api', '/donate', '/patient/find-therapist', '/patient/clinician', '/patient/book-session'];

// Enforce JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // allow public API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if it's a public route - use startsWith for path prefixes
  const isPublic = 
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/education' ||
    pathname === '/testimonials' ||
    pathname === '/api-docs' ||
    pathname === '/donate' ||
    pathname.startsWith('/patient/find-therapist') ||
    pathname.startsWith('/patient/clinician') ||
    pathname.startsWith('/patient/book-session');

  if (isPublic) {
    return NextResponse.next();
  }

  // check if route requires authentication
  const requiresAuth = authRequiredRoutes.some(route => pathname.startsWith(route));

  if (requiresAuth) {
    // get token from cookie or header
    const token = request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    // redirect to login if no token
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // verify token and check role
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userRole = payload.role as string;
      const subscriptionStatus = payload.subscription_status as string;

      const isVerified = payload.is_verified as number ?? 0;

      // Special check for therapist verification
      if (userRole === 'therapist' && pathname.startsWith('/clinician')) {
        // If therapist account is not verified yet
        if (!isVerified) {
          if (pathname !== '/clinician/pending') {
            return NextResponse.redirect(new URL('/clinician/pending', request.url));
          }
        }
        // If therapist is verified, redirect away from pending
        else if (pathname === '/clinician/pending') {
          return NextResponse.redirect(new URL('/clinician', request.url));
        }
      }

      // check role permissions for protected routes
      for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
        if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
          // unauthorized - redirect to their appropriate dashboard
          const roleRedirectMap: Record<string, string> = {
            'admin': '/admin',
            'patient': '/patient',
            'therapist': '/clinician',
            'org_admin': '/organization',
          };
          const redirectPath = roleRedirectMap[userRole] || '/login';
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }

      // pass through with valid token and role
      const response = NextResponse.next();
      response.headers.set('x-user-role', userRole);
      return response;
    } catch (error) {
      console.error('Token verification failed:', error);
      const loginUrl = new URL('/login', request.url); //Invalid token, redirect to login
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
