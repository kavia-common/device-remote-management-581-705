import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tenant {
  id: string;
  name: string;
}

interface TenantState {
  tenants: Tenant[];
  selectedTenantId: string | null;
  // PUBLIC_INTERFACE
  setTenants: (tenants: Tenant[]) => void;
  // PUBLIC_INTERFACE
  selectTenant: (tenantId: string) => void;
  // PUBLIC_INTERFACE
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenants: [],
      selectedTenantId: null,
      // PUBLIC_INTERFACE
      setTenants: (tenants: Tenant[]) => set({ tenants }),
      // PUBLIC_INTERFACE
      selectTenant: (tenantId: string) => set({ selectedTenantId: tenantId }),
      // PUBLIC_INTERFACE
      clearTenant: () => set({ selectedTenantId: null })
    }),
    {
      name: 'tenant-storage'
    }
  )
);
