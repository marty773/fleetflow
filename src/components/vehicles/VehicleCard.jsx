import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function VehicleCard({ vehicle, onEdit, onDelete, isDeleting }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-slate-100 p-2 rounded-lg">
              <Truck className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-lg">{vehicle.name}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {vehicle.type?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Make/Model</p>
            <p className="font-semibold text-slate-900">{vehicle.make} {vehicle.model}</p>
          </div>
          <div>
            <p className="text-slate-600">Year</p>
            <p className="font-semibold text-slate-900">{vehicle.year}</p>
          </div>
          <div>
            <p className="text-slate-600">License Plate</p>
            <p className="font-semibold text-slate-900">{vehicle.license_plate}</p>
          </div>
          {vehicle.purchase_date && (
            <div>
              <p className="text-slate-600">Purchased</p>
              <p className="font-semibold text-slate-900">{format(new Date(vehicle.purchase_date), 'MMM yyyy')}</p>
            </div>
          )}
          {vehicle.vin && (
            <div className="col-span-2">
              <p className="text-slate-600">VIN</p>
              <p className="font-semibold text-slate-900 text-xs">{vehicle.vin}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(vehicle)}
            className="flex-1"
          >
            <Edit2 className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Delete this vehicle?')) {
                onDelete();
              }
            }}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}