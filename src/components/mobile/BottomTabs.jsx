import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, Truck, FileText, Home } from 'lucide-react';

export default function BottomTabs({ currentPageName }) {
  const tabs = [
    { name: 'Dashboard', path: 'Dashboard', icon: Home },
    { name: 'Vehicles', path: 'Vehicles', icon: Truck },
    { name: 'Bills', path: 'Bills', icon: FileText },
    { name: 'Maintenance', path: 'Maintenance', icon: Wrench },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
      <div className="flex justify-around py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPageName === tab.name;
          return (
            <Link
              key={tab.name}
              to={createPageUrl(tab.path)}
              className={`flex flex-col items-center justify-center px-4 flex-1 transition-colors ${
                 isActive
                   ? 'text-amber-600 border-t-2 border-amber-600'
                   : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
               }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}