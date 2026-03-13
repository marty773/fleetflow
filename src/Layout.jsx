import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Wrench, FileText, Calendar, Truck, Menu, X, Package, DollarSign, Users, Settings, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useState, useEffect, useCallback } from 'react';
import GlobalSearch from '@/components/GlobalSearch';
import CompanySelector from '@/components/CompanySelector';
import BottomTabs from '@/components/mobile/BottomTabs';

function LayoutContent({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const location = useLocation();

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  const mainTabPaths = ['Dashboard', 'Vehicles', 'Bills', 'Maintenance'];
  const isSubPage = !mainTabPaths.includes(currentPageName);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Dynamic theming based on company
  const themeColors = selectedCompany === "Pencroft Structures" 
    ? {
        primary: '#16a34a',      // green-600
        primaryHover: '#15803d',  // green-700
        primaryLight: '#bbf7d0',  // green-200
        accent: '#22c55e',        // green-500
        iconBg: '#16a34a'         // green-600
      }
    : {
        primary: '#f59e0b',       // amber-500
        primaryHover: '#d97706',  // amber-600
        primaryLight: '#fde68a',  // amber-200
        accent: '#f59e0b',        // amber-500
        iconBg: '#d97706'         // amber-600
      };

  const navItems = [
      { name: 'Dashboard', path: 'Dashboard', icon: Wrench },
      { name: 'Vehicles', path: 'Vehicles', icon: Truck },
      { name: 'Bills', path: 'Bills', icon: FileText },
      { name: 'Maintenance', path: 'Maintenance', icon: Wrench },
      { name: 'Items', path: 'Items', icon: Package },
      { name: 'Calendar', path: 'Calendar', icon: Calendar },
      { name: 'Reports', path: 'Reports', icon: DollarSign },
    ];

  const mobilePages = ['Dashboard', 'Vehicles', 'Bills', 'Maintenance'];

  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex">
      <style>{`
        :root {
          --color-primary: ${themeColors.primary};
          --color-primary-hover: ${themeColors.primaryHover};
          --color-primary-light: ${themeColors.primaryLight};
          --color-accent: ${themeColors.accent};
          --color-icon-bg: ${themeColors.iconBg};
        }
        .dark {
          color-scheme: dark;
        }
        .dark * {
          border-color: rgba(148, 163, 184, 0.2);
        }
        .dark input, .dark textarea, .dark select {
          background-color: rgb(30, 41, 59);
          color: rgb(241, 245, 249);
          border-color: rgb(51, 65, 85);
        }
        .dark input::placeholder, .dark textarea::placeholder {
          color: rgb(148, 163, 184);
        }
        /* Ensure dialogs/modals appear above everything and gray out page */
        [data-radix-dialog-overlay] { z-index: 890 !important; background-color: rgba(0, 0, 0, 0.5) !important; }
        [data-radix-dialog-content] { z-index: 900 !important; }
        /* Prevent text selection on interactive elements for better mobile UX */
        button, a, [role="tab"], [role="button"], h1, h2, h3, h4, h5, h6, svg {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
      `}</style>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 lg:hidden flex items-center justify-between h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 pt-[env(safe-area-inset-top)]" style={{ zIndex: 700 }}>
        <div className="flex items-center gap-2">
          {isSubPage ? (
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Go back"
              className="p-2 rounded-lg active:bg-slate-200 dark:active:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-slate-100" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleSidebar}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              className="p-2 rounded-lg active:bg-slate-200 dark:active:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-900 dark:text-slate-100" />
              ) : (
                <Menu className="w-6 h-6 text-slate-900 dark:text-slate-100" />
              )}
            </button>
          )}
        </div>
        <div 
          className="flex-1 text-center text-base font-semibold pointer-events-none"
          style={{ color: themeColors.primary }}
        >
          {selectedCompany}
        </div>

      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-screen overflow-y-auto transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ zIndex: 700 }}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4 mt-12 lg:mt-0">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d462470d43f37f0539478/e0b7746bb_ChatGPTImageFeb2202602_58_12PM.png" alt="FleetFlow" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">FleetFlow</h1>
          </div>



          <nav className="space-y-2">
                    {[...navItems.slice(0, 4), { name: 'Vendors', path: 'Vendors', icon: Truck }, ...navItems.slice(4), { name: 'Settings', path: 'Settings', icon: Settings }, ...(currentUser?.role === 'admin' ? [{ name: 'Users', path: 'UserManagement', icon: Users }] : [])].map(item => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.path)}
                  onClick={handleCloseSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'border-l-4'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  style={isActive ? {
                    backgroundColor: themeColors.primaryLight,
                    color: themeColors.primaryHover,
                    borderLeftColor: themeColors.iconBg
                  } : {}}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden"
            style={{ zIndex: 699 }}
          onClick={handleCloseSidebar}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 w-full pb-24 lg:pb-0 overflow-x-hidden overflow-y-auto" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <div className="mt-14 lg:mt-0 hidden lg:block h-4" />
        {children}
      </main>

      {/* Mobile Bottom Tabs */}
      <BottomTabs currentPageName={currentPageName} />

      {/* Global Search */}
      <GlobalSearch />
      </div>
      );
      }

export default function Layout(props) {
  return <LayoutContent {...props} />;
}