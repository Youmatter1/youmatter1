import { notFound } from 'next/navigation';
import Link from 'next/link';
import { organizationQueries } from '@/lib/db';

export default async function OrgLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await organizationQueries.getOrganizationBySlug(slug) as any;

  if (!org || !org.is_active) {
    notFound();
  }

  const primaryColor = org.primary_color || '#4F46E5';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: `${primaryColor}0d` }}
    >
      <div className="w-full max-w-md text-center">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt={org.name} className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover shadow-sm" />
        ) : (
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {org.name[0]}
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{org.name}</h1>
        <p className="text-lg text-gray-600 mb-10">
          {org.welcome_message || 'Welcome to our wellness program'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/org/${slug}/login`}
            className="rounded-xl px-8 py-3 font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            Log In
          </Link>
          <Link
            href={`/org/${slug}/signup`}
            className="rounded-xl border-2 px-8 py-3 font-semibold transition hover:bg-white"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-16 flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>Powered by</span>
          <span className="flex items-center gap-1.5 font-semibold text-gray-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-green-600 to-green-700 text-[10px] font-bold text-white">
              UM
            </span>
            You Matter
          </span>
        </div>
      </div>
    </div>
  );
}
