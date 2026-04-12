import { useState, useEffect, useContext, createContext } from 'react';
import { base44 } from '@/api/base44Client';

export const ALL_PAGES = ['Dashboard', 'Vehicles', 'Bills', 'Maintenance', 'Items', 'Calendar', 'Reports', 'Vendors'];

export function defaultPermissions() {
  return Object.fromEntries(ALL_PAGES.map(p => [p, { view: true, edit: true }]));
}

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async user => {
      if (!user) return;
      if (user.role === 'admin') { setIsAdmin(true); return; }
      const records = await base44.entities.UserPermissions.filter({ user_email: user.email });
      setPermissions(records.length > 0 ? (records[0].page_permissions || defaultPermissions()) : defaultPermissions());
    }).catch(() => {});
  }, []);

  const canView = (page) => {
    if (isAdmin) return true;
    if (!permissions) return true;
    return permissions[page]?.view !== false;
  };

  const canEdit = (page) => {
    if (isAdmin) return true;
    if (!permissions) return false;
    return permissions[page]?.edit === true;
  };

  return (
    <PermissionsContext.Provider value={{ canView, canEdit, isAdmin, permissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePagePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    return { canView: () => true, canEdit: () => true, isAdmin: true, permissions: null };
  }
  return ctx;
}