import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function CompanySelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
      <Building2 className="w-4 h-4 text-slate-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-0 shadow-none focus:ring-0 h-auto p-0 font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Fisher's Enterprise">Fisher's Enterprise</SelectItem>
          <SelectItem value="Pencroft Structures">Pencroft Structures</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}