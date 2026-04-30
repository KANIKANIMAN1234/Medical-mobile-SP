import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser, Organization, UserRole } from '@/types/app';

interface AppState {
  user: AppUser | null;
  currentOrganization: Organization | null;
  currentRole: UserRole | null;
  organizations: Organization[];
  selectedMemberId: string | null;
  selectedMemberName: string | null;

  setUser: (user: AppUser | null) => void;
  setCurrentOrganization: (org: Organization | null, role: UserRole | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setSelectedMember: (member: { id: string; name: string } | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      currentOrganization: null,
      currentRole: null,
      organizations: [],
      selectedMemberId: null,
      selectedMemberName: null,

      setUser: (user) => set({ user }),

      setCurrentOrganization: (org, role) =>
        set({
          currentOrganization: org,
          currentRole: role,
          selectedMemberId: null,
          selectedMemberName: null,
        }),

      setOrganizations: (orgs) => set({ organizations: orgs }),

      setSelectedMember: (member) =>
        set({
          selectedMemberId: member?.id ?? null,
          selectedMemberName: member?.name ?? null,
        }),

      logout: () =>
        set({
          user: null,
          currentOrganization: null,
          currentRole: null,
          organizations: [],
          selectedMemberId: null,
          selectedMemberName: null,
        }),
    }),
    {
      name: 'kusuri-sp-store',
      partialize: (state) => ({
        user: state.user,
        currentOrganization: state.currentOrganization,
        currentRole: state.currentRole,
        selectedMemberId: state.selectedMemberId,
        selectedMemberName: state.selectedMemberName,
      }),
    }
  )
);
