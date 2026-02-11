import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Building2 } from 'lucide-react';
import { useCompany } from '@/components/CompanyContext';
import { Button } from '@/components/ui/button';

export default function CompanySelector({ value, onChange }) {
  const { allowedCompanies, loading } = useCompany();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
        <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Loading...</span>
      </div>
    );
  }

  // If user only has access to one company, show it as static text
  if (allowedCompanies.length === 1) {
    return (
      <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
        <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="font-medium dark:text-white">{allowedCompanies[0]}</span>
      </div>
    );
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition"
        >
          <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="font-medium dark:text-white flex-1 text-left text-sm">{value}</span>
        </button>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select Company</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-2">
              {allowedCompanies.map(company => (
                <button
                  key={company}
                  onClick={() => {
                    onChange(company);
                    setDrawerOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg text-left font-medium transition ${
                    value === company
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {company}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop select
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm">
      <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-0 shadow-none focus:ring-0 h-auto p-0 font-medium dark:bg-slate-950 dark:text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
          {allowedCompanies.map(company => (
            <SelectItem key={company} value={company} className="dark:text-white dark:hover:bg-slate-900">{company}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}