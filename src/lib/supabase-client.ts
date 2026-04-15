import { createBrowserClient } from '@supabase/ssr';

/**
 * Client-side Supabase instance for browser
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Type definitions for database operations
 */
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          sector: string;
          revenue_usd: number | null;
          employee_count: number | null;
          privatization_readiness_score: number;
          risk_level: string;
          status: string;
          description: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      audits: {
        Row: {
          id: string;
          company_id: string;
          created_by: string;
          title: string;
          description: string | null;
          audit_type: string;
          status: string;
          overall_score: number | null;
          risk_assessment: string | null;
          total_findings: number;
          critical_findings: number;
          total_revenue_reviewed: number | null;
          total_expenses_identified: number | null;
          financial_leaks_usd: number | null;
          optimization_potential_usd: number | null;
          file_url: string | null;
          report_url: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
      };
      audit_findings: {
        Row: {
          id: string;
          audit_id: string;
          category: string;
          severity: string;
          title: string;
          description: string | null;
          affected_amount_usd: number | null;
          recommendation: string | null;
          status: string;
          resolution_date: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          department: string | null;
          profile_picture: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
