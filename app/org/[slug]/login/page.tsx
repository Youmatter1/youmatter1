import { notFound } from 'next/navigation';
import { organizationQueries } from '@/lib/db';
import { OrgLoginForm } from './org-login-form';

export default async function OrgLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await organizationQueries.getOrganizationBySlug(slug) as any;

  if (!org || !org.is_active) {
    notFound();
  }

  return (
    <OrgLoginForm
      slug={slug}
      organizationName={org.name}
      logoUrl={org.logo_url}
      primaryColor={org.primary_color || '#4F46E5'}
    />
  );
}
