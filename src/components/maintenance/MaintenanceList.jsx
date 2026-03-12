import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Eye, Edit2, Trash2, Wrench } from 'lucide-react';
import { useCompany } from '@/components/CompanyContext';
import { useServiceTypes } from '@/components/useServiceTypes';

export default function MaintenanceList({ records, vehicles, items, onView, onEdit, onDelete, isDeleting }) {
  const { selectedCompany } = useCompany();
  const serviceTypes = useServiceTypes(selectedCompany, 'records');

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const getTypeLabel = (value) => {
    const found = serviceTypes.find(t => t.value === value);
    return found ? found.label : (value?.replace(/_/g, ' ') || '');
  };

  const maintenanceColors = {
     oil_change: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
     filter_change: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
     tire_rotation: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
     inspection: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
     repair: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
     cleaning: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
     other: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300',
   };
  const getTypeColor = (value) => maintenanceColors[value] || 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300';

  if (records.length === 0) {
     return (
       <Card className="border-2 border-dashed dark:border-slate-700">
         <CardContent className="p-12 text-center">
           <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
           <p className="text-slate-600 dark:text-slate-400">No maintenance records yet</p>
         </CardContent>
       </Card>
     );
   }

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.performed_date) - new Date(a.performed_date)
  );

  return (
    <div className="space-y-4">
      {sortedRecords.map((record) => (
        <Card 
          key={record.id} 
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onView(record)}
        >
          <CardContent className="p-6">
             <div className="flex items-start justify-between">
               <div className="flex-1">
                 <div className="flex items-center gap-3 mb-2">
                   <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{record.title}</h3>
                   <Badge className={getTypeColor(record.maintenance_type)}>
                     {getTypeLabel(record.maintenance_type)}
                   </Badge>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                   <div>
                     <p className="text-slate-600 dark:text-slate-400">Vehicle</p>
                     <p className="font-semibold text-slate-900 dark:text-white">
                       {vehicleMap[record.vehicle_id]?.name}
                     </p>
                   </div>
                   <div>
                     <p className="text-slate-600 dark:text-slate-400">Date</p>
                     <p className="font-semibold text-slate-900 dark:text-white">
                       {format(new Date(record.performed_date), 'MMM dd, yyyy')}
                     </p>
                   </div>
                   {record.vendor && (
                     <div>
                       <p className="text-slate-600 dark:text-slate-400">Provider</p>
                       <p className="font-semibold text-slate-900 dark:text-white">{record.vendor}</p>
                     </div>
                   )}
                   <div>
                     <p className="text-slate-600 dark:text-slate-400">Cost</p>
                     <p className="font-semibold text-slate-900 dark:text-white">
                       ${record.total_cost?.toFixed(2) || '0.00'}
                     </p>
                   </div>
                 </div>
                 {record.odometer_reading && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                      Odometer: {record.odometer_reading} miles
                    </p>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}