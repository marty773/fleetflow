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
import VendorReport from '../components/reports/VendorReport';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('vehicle-costs');
  const [highlightItemId, setHighlightItemId] = useState(null);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('item');
    
    if (itemId) {
      setSelectedReport('inventory');
      setHighlightItemId(itemId);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
           <div>
             <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Reports</h1>
             <p className="text-slate-600 dark:text-slate-300 mt-2">View detailed reports and analytics</p>
           </div>
           <div className="w-full sm:w-64">
             <Select value={selectedReport} onValueChange={setSelectedReport}>
               <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                 <SelectValue placeholder="Select report" />
               </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                <SelectItem value="vehicle-costs">Vehicle Costs</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="vendors">Vendors</SelectItem>
              </SelectContent>
             </Select>
          </div>
        </div>

        {selectedReport === 'vehicle-costs' && <VehicleCostReport />}
        {selectedReport === 'inventory' && <InventoryReport highlightItemId={highlightItemId} />}
      {selectedReport === 'vendors' && <VendorReport />}
      </div>
    </div>
  );
}