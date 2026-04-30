export type UserRole = 'superadmin' | 'owner' | 'editor' | 'viewer';
export type PlanType = 'free' | 'standard' | 'premium';

export interface AppUser {
  id: string;
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  is_superadmin: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: PlanType;
  trial_ends_at?: string;
  created_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  organization?: Organization;
  user?: AppUser;
}

export interface Member {
  id: string;
  organization_id: string;
  name: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  blood_type?: string;
  is_self: boolean;
  avatar_color?: string;
  created_at: string;
}

export interface Hospital {
  id: string;
  organization_id: string;
  name: string;
  departments?: string[];
  phone?: string;
  address?: string;
  is_favorite?: boolean;
  created_at: string;
}

export interface Visit {
  id: string;
  organization_id: string;
  member_id: string;
  hospital_id?: string;
  hospital_name?: string;
  department?: string;
  visit_date: string;
  chief_complaint?: string;
  diagnosis?: string;
  doctor_name?: string;
  next_visit_date?: string;
  notes?: string;
  created_at: string;
  member?: Member;
  hospital?: Hospital;
  medications?: Medication[];
  medical_expenses?: MedicalExpense[];
}

export interface Medication {
  id: string;
  organization_id: string;
  member_id: string;
  drug_name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: string;
  prescribed_date: string;
  days_supply?: number;
  end_date?: string;
  purpose?: string;
  is_ongoing: boolean;
  reminder_enabled?: boolean;
  reminder_times?: string[];
  created_at: string;
  member?: Member;
}

export interface MedicalExpense {
  id: string;
  organization_id: string;
  member_id: string;
  visit_id?: string;
  expense_date: string;
  facility_name: string;
  expense_type: 'hospital' | 'pharmacy' | 'other';
  total_amount: number;
  insurance_amount?: number;
  receipt_image_url?: string;
  is_deductible: boolean;
  notes?: string;
  created_at: string;
  member?: Member;
}

export type JudgmentLevel = 'A' | 'B' | 'C' | 'D' | 'E';

export interface HealthCheckup {
  id: string;
  organization_id: string;
  member_id: string;
  checkup_date: string;
  facility_name?: string;
  checkup_type?: string;
  overall_judgment?: JudgmentLevel;
  image_urls?: string[];
  notes?: string;
  created_at: string;
  member?: Member;
  checkup_items?: CheckupItem[];
}

export interface CheckupItem {
  id: string;
  checkup_id: string;
  item_name: string;
  value?: number;
  unit?: string;
  reference_range?: string;
  judgment?: JudgmentLevel;
}

export interface DashboardSummary {
  monthly_expense: number;
  yearly_expense: number;
  monthly_visits: number;
  upcoming_visits: Visit[];
  active_medications: Medication[];
  latest_checkup?: HealthCheckup;
}

export interface OcrReceiptResult {
  payment_date?: string;
  facility_name?: string;
  expense_type?: 'hospital' | 'pharmacy' | 'other';
  total_amount?: number;
  items?: Record<string, number>;
  confidence: number;
}

export interface OcrCheckupResult {
  facility_name?: string;
  checkup_date?: string;
  overall_judgment?: JudgmentLevel;
  items: Array<{
    item_name: string;
    value?: number;
    unit?: string;
    reference_range?: string;
    judgment?: JudgmentLevel;
  }>;
  confidence: number;
}
