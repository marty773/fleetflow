import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Truck, Package } from 'lucide-react';

export default function VehicleCard({ vehicle, onEdit, onDelete, isDeleting }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{vehicle.name}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {vehicle.make} {vehicle.model} • {vehicle.year}
            </p>
          </div>
          <Badge variant="secondary" className="bg-slate-100">
            {vehicle.type === 'truck' ? (
              <Truck className="w-3 h-3 mr-1" />
            ) : (
              <Package className="w-3 h-3 mr-1" />
            )}
            {vehicle.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-600">License Plate</p>
            <p className="font-mono font-semibold text-slate-900">{vehicle.license_plate}</p>
          </div>
          {vehicle.vin && (
            <div>
              <p className="text-slate-600">VIN</p>
              <p className="font-mono text-xs text-slate-700 truncate">{vehicle.vin}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t">
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
              if (confirm('Are you sure you want to delete this vehicle?')) {
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