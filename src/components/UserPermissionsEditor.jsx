import React from 'react';
import { ALL_PAGES, defaultPermissions } from '@/hooks/usePagePermissions.jsx';

export default function UserPermissionsEditor({ permissions, onChange }) {
  const perms = permissions || defaultPermissions();

  const toggle = (page, type) => {
    const current = perms[page] || { view: true, edit: true };
    let updated = { ...current, [type]: !current[type] };
    // If disabling view, also disable edit
    if (type === 'view' && !updated.view) updated.edit = false;
    // If enabling edit, also ensure view is on
    if (type === 'edit' && updated.edit) updated.view = true;
    onChange({ ...perms, [page]: updated });
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        <span>Page</span>
        <span className="text-center">View</span>
        <span className="text-center">Edit</span>
      </div>
      {ALL_PAGES.map((page, i) => {
        const p = perms[page] || { view: false, edit: false };
        return (
          <div
            key={page}
            className={`grid grid-cols-3 items-center px-4 py-2.5 ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{page}</span>
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={!!p.view}
                onChange={() => toggle(page, 'view')}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={!!p.edit}
                onChange={() => toggle(page, 'edit')}
                disabled={!p.view}
                className="w-4 h-4 accent-amber-500 cursor-pointer disabled:opacity-30"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}