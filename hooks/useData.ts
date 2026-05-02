import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type {
  Member, Hospital, Visit, Medication, MedicalExpense,
  HealthCheckup, DashboardSummary, OcrReceiptResult, OcrCheckupResult,
  OrganizationUser,
} from '@/types/app';

// ───────── Members ─────────
export function useMembers() {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('m_members')
        .select('*')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('is_self', { ascending: false });
      if (error) throw error;
      return data as Member[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateMember() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization, user } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<Member>) => {
      const { data: result, error } = await supabase
        .from('m_members')
        .insert({ ...data, organization_id: currentOrganization!.id, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

// ───────── Organization Users ─────────
export function useOrganizationUsers() {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['org-users', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('m_organization_users')
        .select('*, user:m_users(id, display_name, picture_url)')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as OrganizationUser[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

// ───────── Hospitals ─────────
export function useHospitals() {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['hospitals', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('m_hospitals')
        .select('*')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as Hospital[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateHospital() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization, user } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<Hospital>) => {
      const { data: result, error } = await supabase
        .from('m_hospitals')
        .insert({ ...data, organization_id: currentOrganization!.id, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });
}

// ───────── Visits ─────────
export function useVisits() {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['visits', orgId, selectedMemberId],
    queryFn: async () => {
      let query = supabase
        .from('t_visits')
        .select('*, member:m_members(id,name,avatar_color), hospital:m_hospitals(id,name)')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('visit_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useVisit(id: string) {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();

  return useQuery({
    queryKey: ['visit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t_visits')
        .select('*, member:m_members(*), hospital:m_hospitals(*)')
        .eq('id', id)
        .eq('organization_id', currentOrganization!.id)
        .single();
      if (error) throw error;
      return data as Visit;
    },
    enabled: !!id && !!currentOrganization,
  });
}

export function useCreateVisit() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization, user } = useAppStore();

  return useMutation({
    mutationFn: async (visitData: Partial<Visit>) => {
      const { data, error } = await supabase
        .from('t_visits')
        .insert({ ...visitData, organization_id: currentOrganization!.id, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteVisit() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('t_visits')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ───────── Medications ─────────
export function useMedications(activeOnly = false) {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['medications', orgId, selectedMemberId, activeOnly],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('t_medications')
        .select('*, member:m_members(id,name)')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('prescribed_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);
      if (activeOnly) {
        query = query.or(`is_ongoing.eq.true,end_date.gte.${today}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateMedication() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization, user } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<Medication>) => {
      const { data: result, error } = await supabase
        .from('t_medications')
        .insert({ ...data, organization_id: currentOrganization!.id, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  });
}

export function useDeleteMedication() {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('t_medications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  });
}

// ───────── Expenses ─────────
export function useExpenses(year?: number) {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;
  const targetYear = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ['expenses', orgId, selectedMemberId, targetYear],
    queryFn: async () => {
      let query = supabase
        .from('t_medical_expenses')
        .select('*, member:m_members(id,name)')
        .eq('organization_id', orgId!)
        .gte('expense_date', `${targetYear}-01-01`)
        .lte('expense_date', `${targetYear}-12-31`)
        .order('expense_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);

      const { data, error } = await query;
      if (error) throw error;
      return data as MedicalExpense[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useCreateExpense() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization, user } = useAppStore();

  return useMutation({
    mutationFn: async (data: Partial<MedicalExpense>) => {
      const { data: result, error } = await supabase
        .from('t_medical_expenses')
        .insert({ ...data, organization_id: currentOrganization!.id, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useOcrReceipt() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ imageBase64, memberId }: { imageBase64: string; memberId: string }): Promise<OcrReceiptResult> => {
      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
        body: { image_base64: imageBase64, member_id: memberId },
      });
      if (error) throw error;
      return data;
    },
  });
}

// ───────── Checkups ─────────
export function useCheckups() {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['checkups', orgId, selectedMemberId],
    queryFn: async () => {
      let query = supabase
        .from('t_health_checkups')
        .select('*, member:m_members(id,name), checkup_items:t_checkup_items(*)')
        .eq('organization_id', orgId!)
        .order('checkup_date', { ascending: false });

      if (selectedMemberId) query = query.eq('member_id', selectedMemberId);

      const { data, error } = await query;
      if (error) throw error;
      return data as HealthCheckup[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckup(id: string) {
  const supabase = createClient();
  const { currentOrganization } = useAppStore();

  return useQuery({
    queryKey: ['checkup', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t_health_checkups')
        .select('*, member:m_members(*), checkup_items:t_checkup_items(*)')
        .eq('id', id)
        .eq('organization_id', currentOrganization!.id)
        .single();
      if (error) throw error;
      return data as HealthCheckup;
    },
    enabled: !!id && !!currentOrganization,
  });
}

export function useCheckupTrends(itemName: string) {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['checkup-trends', orgId, selectedMemberId, itemName],
    queryFn: async () => {
      let q = supabase
        .from('t_checkup_items')
        .select('value, judgment, health_checkup:t_health_checkups!inner(checkup_date, organization_id, member_id)')
        .eq('item_name', itemName)
        .eq('health_checkup.organization_id', orgId!);

      if (selectedMemberId) q = q.eq('health_checkup.member_id', selectedMemberId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!itemName,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCheckup() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { currentOrganization, user } = useAppStore();

  return useMutation({
    mutationFn: async ({
      checkup,
      items,
    }: {
      checkup: Partial<HealthCheckup>;
      items: HealthCheckup['checkup_items'];
    }) => {
      const { data: newCheckup, error } = await supabase
        .from('t_health_checkups')
        .insert({ ...checkup, organization_id: currentOrganization!.id, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      if (items && items.length > 0) {
        const { error: itemsError } = await supabase
          .from('t_checkup_items')
          .insert(items.map((item) => ({ ...item, checkup_id: newCheckup.id })));
        if (itemsError) throw itemsError;
      }
      return newCheckup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkups'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useOcrCheckup() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ imagesBase64 }: { imagesBase64: string[] }): Promise<OcrCheckupResult> => {
      const { data, error } = await supabase.functions.invoke('ocr-checkup', {
        body: { images_base64: imagesBase64 },
      });
      if (error) throw error;
      return data;
    },
  });
}

// ───────── Dashboard ─────────
export function useDashboard() {
  const supabase = createClient();
  const { selectedMemberId, currentOrganization } = useAppStore();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['dashboard', orgId, selectedMemberId],
    queryFn: async (): Promise<DashboardSummary> => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const thisYear = `${today.getFullYear()}`;

      let expenseMonthQ = supabase.from('t_medical_expenses').select('total_amount')
        .eq('organization_id', orgId!)
        .gte('expense_date', `${thisMonth}-01`).lte('expense_date', `${thisMonth}-31`);
      if (selectedMemberId) expenseMonthQ = expenseMonthQ.eq('member_id', selectedMemberId);

      let expenseYearQ = supabase.from('t_medical_expenses').select('total_amount')
        .eq('organization_id', orgId!)
        .gte('expense_date', `${thisYear}-01-01`).lte('expense_date', `${thisYear}-12-31`);
      if (selectedMemberId) expenseYearQ = expenseYearQ.eq('member_id', selectedMemberId);

      let visitsCountQ = supabase.from('t_visits').select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!).is('deleted_at', null)
        .gte('visit_date', `${thisMonth}-01`).lte('visit_date', `${thisMonth}-31`);
      if (selectedMemberId) visitsCountQ = visitsCountQ.eq('member_id', selectedMemberId);

      let upcomingQ = supabase.from('t_visits')
        .select('*, hospital:m_hospitals(name), member:m_members(name,avatar_color)')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .gte('next_visit_date', todayStr).order('next_visit_date').limit(3);
      if (selectedMemberId) upcomingQ = upcomingQ.eq('member_id', selectedMemberId);

      let medsQ = supabase.from('t_medications')
        .select('*, member:m_members(name)')
        .eq('organization_id', orgId!).is('deleted_at', null)
        .or(`is_ongoing.eq.true,end_date.gte.${todayStr}`)
        .order('prescribed_date', { ascending: false }).limit(5);
      if (selectedMemberId) medsQ = medsQ.eq('member_id', selectedMemberId);

      let checkupQ = supabase.from('t_health_checkups')
        .select('*, checkup_items:t_checkup_items(*), member:m_members(name)')
        .eq('organization_id', orgId!)
        .order('checkup_date', { ascending: false }).limit(1);
      if (selectedMemberId) checkupQ = checkupQ.eq('member_id', selectedMemberId);

      const [expenseMonth, expenseYear, visitsCount, upcoming, meds, checkup] =
        await Promise.all([expenseMonthQ, expenseYearQ, visitsCountQ, upcomingQ, medsQ, checkupQ]);

      return {
        monthly_expense: ((expenseMonth.data ?? []) as { total_amount: number }[]).reduce((s, e) => s + (e.total_amount ?? 0), 0),
        yearly_expense: ((expenseYear.data ?? []) as { total_amount: number }[]).reduce((s, e) => s + (e.total_amount ?? 0), 0),
        monthly_visits: visitsCount.count ?? 0,
        upcoming_visits: (upcoming.data ?? []) as DashboardSummary['upcoming_visits'],
        active_medications: (meds.data ?? []) as DashboardSummary['active_medications'],
        latest_checkup: (checkup.data?.[0] ?? undefined) as DashboardSummary['latest_checkup'],
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2,
  });
}
