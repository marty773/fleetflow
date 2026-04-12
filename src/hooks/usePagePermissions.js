import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePagePermissions() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = user?.role === 'admin';

  const { data: permRecords = [], isLoading: permLoading } = useQuery({
    queryKey: ['pagePermissions', user?.email],
    queryFn: () => base44.entities.UserPagePermissions.filter({ user_email: user.email }),
    enabled: !!user && !isAdmin,
    staleTime: 60 * 1000,
  });

  const perm = permRecords[0] || {};

  // canView: while user is loading keep nav visible; once loaded check perms
  const canView = (page) => {
    if (userLoading) return true;
    if (isAdmin) return true;
    if (permLoading) return true;
    const val = perm[page] ?? 'edit';
    return val === 'view' || val === 'edit';
  };

  // canEdit: hide write buttons while loading to prevent flash of access
  const canEdit = (page) => {
    if (userLoading) return false;
    if (isAdmin) return true;
    if (permLoading) return false;
    const val = perm[page] ?? 'edit';
    return val === 'edit';
  };

  return { canView, canEdit, isAdmin, isLoading: userLoading || permLoading, user };
}

export const DEFAULT_PERMISSIONS = {
  dashboard: 'edit',
  vehicles: 'edit',
  bills: 'edit',
  maintenance: 'edit',
  items: 'edit',
  calendar: 'edit',
  reports: 'edit',
  vendors: 'edit',
};

export const PAGE_LIST = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'bills', label: 'Bills & Expenses' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'items', label: 'Items / Inventory' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'reports', label: 'Reports' },
  { key: 'vendors', label: 'Vendors' },
];