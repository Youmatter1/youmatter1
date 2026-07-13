import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { organizationQueries } from '@/lib/db';

export default async function OrgSignupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await organizationQueries.getOrganizationBySlug(slug) as any;

  if (!org || !org.is_active) {
    notFound();
  }

  const primaryColor = org.primary_color || '#4F46E5';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt={org.name} className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-sm" />
        ) : (
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {org.name[0]}
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-900 mb-6">{org.name}</h1>

        <div className="rounded-3xl bg-white p-8 shadow-lg border border-gray-200 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 text-center">Invitation Required</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Accounts for {org.name} are set up by invitation only. If you&apos;ve received an invitation
            email, please use the link inside it to set up your account.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            If your invitation has expired or you can&apos;t find it, contact your administrator to request a new one.
          </p>

          {org.billing_email ? (
            <a
              href={`mailto:${org.billing_email}`}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl border-2 px-6 py-3 font-semibold transition hover:bg-gray-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <Mail className="h-4 w-4" />
              Contact Administrator
            </a>
          ) : null}

          <p className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{' '}
            <Link href={`/org/${slug}/login`} className="font-semibold text-gray-700 hover:text-gray-900 underline">
              Log in
            </Link>
          </p>
        </div>

        <p className="mt-8 text-xs text-gray-400">Powered by You Matter</p>
      </div>
    </div>
  );
}
