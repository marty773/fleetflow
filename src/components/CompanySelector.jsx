import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useCompany } from '@/components/CompanyContext';

export default function CompanySelector({ value, onChange }) {
  const { allowedCompanies, loading } = useCompany();

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
        <Building2 className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  // If user only has access to one company, show it as static text
  if (allowedCompanies.length === 1) {
    return (
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
        <Building2 className="w-4 h-4 text-slate-500" />
        <span className="font-medium">{allowedCompanies[0]}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
      <Building2 className="w-4 h-4 text-slate-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-0 shadow-none focus:ring-0 h-auto p-0 font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowedCompanies.map(company => (
            <SelectItem key={company} value={company}>{company}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}