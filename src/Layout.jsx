import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Wrench, FileText, Calendar, Truck, Menu, X, Package, DollarSign } from 'lucide-react';
import { useState } from 'react';
import GlobalSearch from '@/components/GlobalSearch';
import CompanySelector from '@/components/CompanySelector';
import { CompanyProvider, useCompany } from '@/components/CompanyContext';

function LayoutContent({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { selectedCompany, setSelectedCompany } = useCompany();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      <style>{`
        :root {
          --color-primary: ${themeColors.primary};
          --color-primary-hover: ${themeColors.primaryHover};
          --color-primary-light: ${themeColors.primaryLight};
          --color-accent: ${themeColors.accent};
          --color-icon-bg: ${themeColors.iconBg};
        }
      `}</style>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden flex items-center h-14 px-4 bg-white border-b border-slate-200">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-200 rounded-lg transition"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6 text-slate-900" />
          ) : (
            <Menu className="w-6 h-6 text-slate-900" />
          )}
        </button>
        <div 
          className="flex-1 text-center text-base font-semibold pr-12"
          style={{ color: themeColors.primary }}
        >
          {selectedCompany}
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative w-64 bg-white border-r border-slate-200 h-screen overflow-y-auto transition-all duration-300 z-30 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4 mt-12 lg:mt-0">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d462470d43f37f0539478/e0b7746bb_ChatGPTImageFeb2202602_58_12PM.png" alt="FleetFlow" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold text-slate-900">FleetFlow</h1>
          </div>

          <div className="mb-6">
            <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
          </div>

          <nav className="space-y-2">
                    {[...navItems.slice(0, 4), { name: 'Vendors', path: 'Vendors', icon: Truck }, ...navItems.slice(4)].map(item => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.path)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'border-l-4'
                      : 'text-slate-600 hover:bg-slate-50'
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
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 w-full pb-24">
        <div 
          className="mt-14 lg:mt-0 hidden lg:flex items-center justify-center h-14 text-base font-semibold"
          style={{ color: themeColors.primary }}
        >
          {selectedCompany}
        </div>
        {children}
      </main>

      {/* Global Search */}
      <GlobalSearch />
      </div>
      );
      }

export default function Layout(props) {
  return (
    <CompanyProvider>
      <LayoutContent {...props} />
    </CompanyProvider>
  );
}