'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  role: 'patient' | 'therapist' | 'admin' | 'org_admin';
  isVerified: boolean;
  profile?: any;
  // Org-scoped tenancy: both null for independent (B2C) users.
  organization_id?: number | null;
  org_role?: 'org_admin' | 'therapist' | 'member' | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, expectedRole?: 'patient' | 'therapist' | 'org_admin') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      // verify token and get user info
      fetchUserProfile(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser({
            id: data.user.userId,
            email: data.user.email,
            role: data.user.role,
            isVerified: true,
            profile: data.user.profile,
            organization_id: data.user.organization_id ?? null,
            org_role: data.user.org_role ?? null,
          });
          setToken(authToken);
        }
      } else {
        // invalid token, clear it
        localStorage.removeItem('token');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, expectedRole?: 'patient' | 'therapist' | 'org_admin') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, role: expectedRole }),
      });

      const data = await response.json();

      console.log('Login response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // store token
      localStorage.setItem('token', data.token);
      document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`; // 1 day

      setToken(data.token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        isVerified: data.user.isVerified === 1,
        organization_id: data.user.organization_id ?? null,
        org_role: data.user.org_role ?? null,
      });

      console.log('User role:', data.user.role);

      const redirectMap = {
        'admin': '/admin',
        'therapist': '/clinician',
        'patient': '/patient',
        'org_admin': '/organization',
      };
      const roleHome = redirectMap[data.user.role as keyof typeof redirectMap] || '/';

      // Only honor a ?redirect= param if it actually belongs to this role's area —
      // otherwise a stale param from a previous session (e.g. someone else's link,
      // or a leftover ?redirect=/organization from testing a different account)
      // would silently send this user into the wrong dashboard.
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect');
      const redirectPath = redirectParam && redirectParam.startsWith(roleHome) ? redirectParam : roleHome;
      console.log('Redirecting to:', redirectPath);

      // Use window.location for a hard redirect to ensure middleware runs
      window.location.href = redirectPath;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API to clear server-side cookie and log activity
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Clear client-side storage
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    setUser(null);
    setToken(null);

    // Hard redirect to login page to ensure clean state
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
