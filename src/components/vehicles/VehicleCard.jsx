import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Truck, Container, Eye } from 'lucide-react';

export default function VehicleCard({ vehicle, onView, onEdit, onDelete, isDeleting }) {
  return (
    <Card 
      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onView}
    >
      <CardHeader className="pb-3">
         <div className="flex items-start justify-between">
           <div>
             <CardTitle className="text-lg text-slate-900 dark:text-white">{vehicle.name}</CardTitle>
             <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
               {vehicle.make} {vehicle.model} • {vehicle.year}
             </p>
           </div>
           <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
             {vehicle.type === 'truck' ? (
               <Truck className="w-3 h-3 mr-1" />
             ) : (
               <Container className="w-3 h-3 mr-1" />
             )}
             {vehicle.type}
           </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-600 dark:text-slate-400">License Plate</p>
            <p className="font-mono font-semibold text-slate-900 dark:text-white">{vehicle.license_plate}</p>
          </div>
          {vehicle.vin && (
            <div>
              <p className="text-slate-600 dark:text-slate-400">VIN</p>
              <p className="font-mono text-sm text-slate-700 dark:text-slate-300 truncate">{vehicle.vin}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}