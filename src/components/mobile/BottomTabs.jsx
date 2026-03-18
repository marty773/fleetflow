import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, Truck, FileText, Home } from 'lucide-react';

export default function BottomTabs({ currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollPositions = useRef({});

  const tabs = [
    { name: 'Dashboard', path: 'Dashboard', icon: Home },
    { name: 'Vehicles', path: 'Vehicles', icon: Truck },
    { name: 'Bills', path: 'Bills', icon: FileText },
    { name: 'Maintenance', path: 'Maintenance', icon: Wrench },
  ];

  // Save scroll position when leaving a tab
  useEffect(() => {
    const saveScrollPosition = () => {
      scrollPositions.current[currentPageName] = window.scrollY;
    };

    window.addEventListener('scroll', saveScrollPosition);
    return () => window.removeEventListener('scroll', saveScrollPosition);
  }, [currentPageName]);

  // Restore scroll position when returning to a tab
  useEffect(() => {
    const savedPosition = scrollPositions.current[currentPageName];
    if (savedPosition !== undefined) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedPosition);
      });
    }
  }, [location.pathname, currentPageName]);

  const handleTabClick = (tab) => {
    const isActive = currentPageName === tab.name;
    if (isActive) {
      // Reset navigation to root view by navigating to the page without params
      navigate(createPageUrl(tab.path), { replace: true });
      // Scroll to top and clear saved position
      window.scrollTo(0, 0);
      scrollPositions.current[tab.name] = 0;
    } else {
      navigate(createPageUrl(tab.path));
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
      <div className="flex justify-around py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPageName === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              aria-label={`Navigate to ${tab.name}`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center px-4 flex-1 transition-colors ${
                 isActive
                   ? 'text-amber-600'
                   : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}