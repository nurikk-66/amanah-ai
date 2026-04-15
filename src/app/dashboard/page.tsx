import { MainDashboard } from '@/components/dashboard/main-dashboard';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function DashboardPage() {
  // Fetch companies from Supabase
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('privatization_readiness_score', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error fetching companies:', error);
  }

  const companiesData = companies || [];

  return <MainDashboard companies={companiesData} userRole="auditor" />;
}
