// AuditAI Type Definitions

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'auditor' | 'reviewer' | 'viewer';
  department?: string;
  profile_picture?: string;
  is_active: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  revenue_usd: number;
  employee_count: number;
  privatization_readiness_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_review' | 'auditing' | 'approved' | 'rejected';
  description?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Audit {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  description?: string;
  audit_type: 'financial' | 'operational' | 'compliance' | 'combined';
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  overall_score?: number;
  risk_assessment?: 'low' | 'medium' | 'high' | 'critical';
  total_findings: number;
  critical_findings: number;
  total_revenue_reviewed?: number;
  total_expenses_identified?: number;
  financial_leaks_usd?: number;
  optimization_potential_usd?: number;
  file_url?: string;
  report_url?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AuditFinding {
  id: string;
  audit_id: string;
  category: 'revenue_leak' | 'cost_overrun' | 'compliance_gap' | 'efficiency_loss' | 'fraud_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  affected_amount_usd?: number;
  recommendation?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';
  resolution_date?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialData {
  id: string;
  audit_id: string;
  file_name: string;
  file_type: 'pdf' | 'xlsx' | 'csv';
  encrypted_hash: string;
  file_size_bytes: number;
  period_start?: string;
  period_end?: string;
  data_categories: string[];
  created_at: string;
}

export interface AuditComment {
  id: string;
  audit_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditReport {
  audit: Audit;
  findings: AuditFinding[];
  summary: {
    total_findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  financial_impact: {
    total_leaks: number;
    optimization_potential: number;
    payback_period_months: number;
  };
  recommendations: string[];
}

export type AuditStatus = Audit['status'];
export type RiskLevel = Company['risk_level'];
export type UserRole = User['role'];
