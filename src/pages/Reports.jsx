import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import VehicleCostReport from '../components/reports/VehicleCostReport';
import InventoryReport from '../components/reports/InventoryReport';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('vehicle-costs');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-600 mt-2">View detailed reports and analytics</p>
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select report" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle-costs">Vehicle Costs</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedReport === 'vehicle-costs' && <VehicleCostReport />}
        {selectedReport === 'inventory' && <InventoryReport />}
      </div>
    </div>
  );
}