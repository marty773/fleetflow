import React from 'react';
import { PAGE_LIST } from '@/hooks/usePagePermissions';

const LEVELS = [
  { value: 'none', label: 'No Access', headerColor: 'text-red-600 dark:text-red-400' },
  { value: 'view', label: 'View Only', headerColor: 'text-blue-600 dark:text-blue-400' },
  { value: 'edit', label: 'Full Access', headerColor: 'text-green-600 dark:text-green-400' },
];

const DOT_COLORS = {
  none: 'bg-red-500',
  view: 'bg-blue-500',
  edit: 'bg-green-500',
};

export function PermissionBadge({ permissions }) {
  const counts = { none: 0, view: 0, edit: 0 };
  PAGE_LIST.forEach(p => {
    const val = permissions?.[p.key] ?? 'edit';
    counts[val] = (counts[val] || 0) + 1;
  });
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {counts.edit > 0 && (
        <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          {counts.edit} full
        </span>
      )}
      {counts.view > 0 && (
        <span className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          {counts.view} view
        </span>
      )}
      {counts.none > 0 && (
        <span className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          {counts.none} hidden
        </span>
      )}
    </div>
  );
}

export default function PagePermissionsEditor({ permissions, onChange }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-sm">
      {/* Header */}
      <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-800 px-3 py-2">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Page</div>
        {LEVELS.map(l => (
          <div key={l.value} className={`text-center text-xs font-semibold ${l.headerColor}`}>{l.label}</div>
        ))}
      </div>
      {/* Rows */}
      {PAGE_LIST.map((page, i) => {
        const current = permissions?.[page.key] ?? 'edit';
        return (
          <div
            key={page.key}
            className={`grid grid-cols-4 items-center px-3 py-2.5 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
          >
            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${DOT_COLORS[current]}`} />
              {page.label}
            </div>
            {LEVELS.map(level => (
              <div key={level.value} className="flex justify-center">
                <input
                  type="radio"
                  name={`perm-${page.key}`}
                  value={level.value}
                  checked={current === level.value}
                  onChange={() => onChange({ ...permissions, [page.key]: level.value })}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}