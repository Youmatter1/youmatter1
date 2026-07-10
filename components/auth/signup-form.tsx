'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, X, CheckCircle, Circle } from 'lucide-react';

type UserRole = 'patient' | 'therapist' | 'org_admin';

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
}

const roles: RoleOption[] = [
  {
    value: 'patient',
    label: 'Patient / Client',
    description: 'Find a therapist, book sessions, and manage your wellness journey',
  },
  {
    value: 'therapist',
    label: 'Licensed Therapist',
    description: 'Provide therapy services and manage your practice',
  },
  {
    value: 'org_admin',
    label: 'Register Organization',
    description: 'Give your employees access to therapy and manage your team\'s account',
  },
];

const requiredDocs = [
  "Government-issued ID",
  "Professional license (LMHC, LPCC, LPC, LCSW, Psy.D, PhD)",
  "Graduate degree diploma in psychology or related field",
  "Professional liability insurance certificate",
] as const;

interface SignupFormProps {
  preSelectedRole?: UserRole;
}

export function SignupForm({ preSelectedRole }: SignupFormProps = {}) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(preSelectedRole || null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    // patient fields
    username: '',
    // Common fields
    full_name: '',
    phone: '',
    // patient specific
    date_of_birth: '',
    gender: '',
    // therapist fields
    specialization: '',
    years_of_experience: '',
    bio: '',
    license_number: '',
    institution_name: '',
    country: '',
    contact_email: '',
    mission: '',
    // therapist documents
    documents: [] as File[],
    // organization fields
    organization_name: '',
    domain: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  // Password Validation State
  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
  });

  // Username Error State
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    if (e.target.name === 'password') {
      const pass = e.target.value;
      setPasswordCriteria({
        minLength: pass.length >= 8,
        hasUpper: /[A-Z]/.test(pass),
        hasLower: /[a-z]/.test(pass),
        hasNumber: /[0-9]/.test(pass),
      });
      // Clear main error when user types to encourage them
      if (error) setError(null);
    }

    if (e.target.name === 'username') {
      const uname = e.target.value;
      if (uname.length > 0) {
        if (uname.length < 3) {
          setUsernameError('Username must be at least 3 characters');
        } else if (!/^[a-zA-Z0-9_-]+$/.test(uname)) {
          setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
        } else {
          setUsernameError(null);
        }
      } else {
        setUsernameError(null);
      }
    }
  };

  const handleFileChange = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFiles(prev => ({
        ...prev,
        [docType]: file
      }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const { minLength, hasUpper, hasLower, hasNumber } = passwordCriteria;
    if (!minLength || !hasUpper || !hasLower || !hasNumber) {
      setError('Please meet all password requirements');
      return;
    }

    if (selectedRole === 'patient' && usernameError) {
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        role: selectedRole,
      };

      if (selectedRole === 'patient') {
        payload.username = formData.username;
        if (formData.full_name) payload.full_name = formData.full_name;
        if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
        if (formData.gender) payload.gender = formData.gender;
        if (formData.phone) payload.phone = formData.phone;
      } else if (selectedRole === 'therapist') {
        payload.full_name = formData.full_name;
        payload.specialization = formData.specialization;
        payload.years_of_experience = parseInt(formData.years_of_experience) || 0;
        payload.bio = formData.bio;
        payload.phone = formData.phone;
        payload.license_number = formData.license_number;
        payload.institution_name = formData.institution_name;
        payload.country = formData.country;
        payload.contact_email = formData.contact_email;
        payload.mission = formData.mission;

        // Validate required documents
        const missingDocs = requiredDocs.filter(doc => !uploadedFiles[doc]);
        if (missingDocs.length > 0) {
          throw new Error(`Please upload the following documents: ${missingDocs.join(', ')}`);
        }

        const uploadedUrls: string[] = [];

        // Upload each file
        for (const docType of requiredDocs) {
          const file = uploadedFiles[docType];
          if (!file) continue;

          const customFileName = `${docType.replace(/[^a-zA-Z0-9]/g, '_')}-${file.name}`;
          const renamedFile = new File([file], customFileName, { type: file.type });

          const uploadFormData = new FormData();
          uploadFormData.append('file', renamedFile);

          try {
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: uploadFormData,
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              if (uploadData.success && uploadData.url) {
                uploadedUrls.push(uploadData.url);
              }
            } else {
              console.error('Failed to upload file:', file.name);
              throw new Error(`Failed to upload ${docType}`);
            }
          } catch (uploadErr) {
            console.error('Error uploading file:', uploadErr);
            throw uploadErr;
          }
        }

        payload.documents = uploadedUrls;
      } else if (selectedRole === 'org_admin') {
        payload.organization_name = formData.organization_name;
        if (formData.domain) payload.domain = formData.domain;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.errors && Array.isArray(data.errors)) {
          const newFieldErrors: Record<string, string> = {};
          data.errors.forEach((err: string) => {
            const parts = err.split(':');
            if (parts.length >= 2) {
              const field = parts[0].trim();
              const message = parts.slice(1).join(':').trim();
              newFieldErrors[field] = message;
            }
          });
          setFieldErrors(newFieldErrors);

          // Also set a generic top-level error if needed, or rely on field errors
          if (!error && Object.keys(newFieldErrors).length === 0) {
            throw new Error(data.error || 'Registration failed');
          }
        } else {
          throw new Error(data.error || 'Registration failed');
        }
        return; // Stop execution
      }

      if (data.token) {
        // Clear any existing tokens first
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');

        // Store new token with correct key 'token' (matching middleware and auth-context)
        localStorage.setItem('token', data.token);
        document.cookie = `token=${data.token}; path=/; max-age=604800; SameSite=Lax`;

        const redirectMap = {
          'patient': '/patient',
          'therapist': '/clinician/pending',
          'org_admin': '/organization',
        };

        window.location.href = redirectMap[selectedRole];
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-6">Select your account type to get started</p>
        {roles.map((role) => (
          <button
            key={role.value}
            onClick={() => setSelectedRole(role.value)}
            className="w-full text-left p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-800 hover:bg-gray-50 transition-all group"
          >
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-800">
              {role.label}
            </h3>
            <p className="text-sm text-gray-600">{role.description}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-100">
        <div>
          <p className="text-xs text-gray-600">Account type:</p>
          <p className="font-semibold text-gray-900">
            {roles.find(r => r.value === selectedRole)?.label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedRole(null)}
          className="text-xs font-semibold text-gray-700 hover:text-gray-900"
        >
          Change
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" requiredIndicator>Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder='youremail@gmail.com'
            className={`border-gray-300 focus:border-gray-800 focus:ring-gray-300 ${fieldErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <X className="w-3 h-3" /> {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" requiredIndicator>Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder="At least 8 characters..."
            className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
          />
          {/* Password Strength Checklist */}
          <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">Password requirements:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className={`flex items-center gap-2 text-xs ${passwordCriteria.minLength ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                {passwordCriteria.minLength ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                <span>Minimum 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${passwordCriteria.hasUpper ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                {passwordCriteria.hasUpper ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                <span>One uppercase letter</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${passwordCriteria.hasLower ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                {passwordCriteria.hasLower ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                <span>One lowercase letter</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${passwordCriteria.hasNumber ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                {passwordCriteria.hasNumber ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                <span>One number</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" requiredIndicator>Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder='confirm your password'
            className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
          />
        </div>

        {/* patient-specific fields */}
        {selectedRole === 'patient' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username" requiredIndicator>Username</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Choose a unique username"
                className={`border-gray-300 focus:border-gray-800 focus:ring-gray-300 ${usernameError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              {usernameError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> {usernameError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Enter your full name"
                className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="+250788123456"
                className={`border-gray-300 focus:border-gray-800 focus:ring-gray-300 ${fieldErrors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> {fieldErrors.phone}
                </p>
              )}
            </div>
          </>
        )}

        {/* therapist fields with document upload */}
        {selectedRole === 'therapist' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="full_name" requiredIndicator>Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Mr. John Doe"
                className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution_name" requiredIndicator>
                Institution name
              </Label>
              <Input
                id="institution_name"
                name="institution_name"
                value={formData.institution_name}
                onChange={handleChange}
                placeholder="recent institution"
                className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country" requiredIndicator>
                  Country
                </Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="South Africa"
                  className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email" requiredIndicator>
                  Contact email
                </Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder=""
                  className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization" requiredIndicator>Specialization</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="e.g., English Literature, TEFL"
                  className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years_of_experience">Years of Experience</Label>
                <Input
                  id="years_of_experience"
                  name="years_of_experience"
                  type="number"
                  value={formData.years_of_experience}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="0"
                  className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">License/Certificate Number</Label>
                <Input
                  id="license_number"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="TEFL-12345"
                  className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="+250788123456"
                  className={`border-gray-300 focus:border-gray-800 focus:ring-gray-300 ${fieldErrors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <X className="w-3 h-3" /> {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mission">
                Mission and community impact
              </Label>
              <textarea
                id="mission"
                name="mission"
                value={formData.mission}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Share how you support language learning and cultural exchange for international patients."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio / About Me</Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={isLoading}
                rows={3}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Tell us about your experience ..."
              />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                therapist Verification Documents
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please upload the following required documents (PDF, DOCX, or PNG).
              </p>

              <div className="space-y-4">
                {requiredDocs.map((doc, index) => (
                  <div key={doc} className="space-y-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <Label htmlFor={`doc-${index}`} requiredIndicator>
                      {doc}
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        id={`doc-${index}`}
                        type="file"
                        onChange={(e) => handleFileChange(doc, e)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                      />
                    </div>
                    {uploadedFiles[doc] ? (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                        ✓ {uploadedFiles[doc].name} ({(uploadedFiles[doc].size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    ) : (
                      <p className="text-xs text-red-500">Required</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* organization fields */}
        {selectedRole === 'org_admin' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="organization_name" requiredIndicator>Organization Name</Label>
              <Input
                id="organization_name"
                name="organization_name"
                value={formData.organization_name}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Acme Inc"
                className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Company Domain</Label>
              <Input
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="acme.com"
                className="border-gray-300 focus:border-gray-800 focus:ring-gray-300"
              />
              <p className="text-xs text-gray-500">Optional — helps us match employees who sign up with a company email.</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-xs text-gray-600">
              This email will be the organization's first admin. You'll be able to invite your team and manage seats from your dashboard right after signing up.
            </div>
          </>
        )}
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="w-full bg-green-600 text-white hover:bg-green-700"
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>

      {selectedRole === 'therapist' && (
        <p className="text-xs text-center text-gray-600">
          Your account will be reviewed for verification. You'll receive an email once approved.
        </p>
      )}
    </form>
  );
}