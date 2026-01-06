import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Wrench, FileText, Calendar, Truck, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: 'Dashboard', icon: Wrench },
    { name: 'Vehicles', path: 'Vehicles', icon: Truck },
    { name: 'Bills', path: 'Bills', icon: FileText },
    { name: 'Maintenance', path: 'Maintenance', icon: Wrench },
    { name: 'Calendar', path: 'Calendar', icon: Calendar },
    { name: 'Items', path: 'ItemGallery', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-40 lg:hidden">
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
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative w-64 bg-white border-r border-slate-200 h-screen overflow-y-auto transition-all duration-300 z-30 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 mt-12 lg:mt-0">
            <Truck className="w-8 h-8 text-amber-600" />
            <h1 className="text-xl font-bold text-slate-900">FleetTracker</h1>
          </div>

          <nav className="space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.path)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-amber-50 text-amber-700 border-l-4 border-amber-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
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
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}