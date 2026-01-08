import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Eye, Edit2, Trash2, Wrench } from 'lucide-react';

export default function MaintenanceList({ records, vehicles, items, onView, onEdit, onDelete, isDeleting }) {
  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const maintenanceColors = {
    oil_change: 'bg-blue-100 text-blue-800',
    filter_change: 'bg-yellow-100 text-yellow-800',
    tire_rotation: 'bg-purple-100 text-purple-800',
    inspection: 'bg-indigo-100 text-indigo-800',
    repair: 'bg-red-100 text-red-800',
    cleaning: 'bg-green-100 text-green-800',
    other: 'bg-slate-100 text-slate-800',
  };

  if (records.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600">No maintenance records yet</p>
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
        <Card key={record.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">{record.title}</h3>
                  <Badge className={maintenanceColors[record.maintenance_type]}>
                    {record.maintenance_type?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-slate-600">Vehicle</p>
                    <p className="font-semibold text-slate-900">
                      {vehicleMap[record.vehicle_id]?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Date</p>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(record.performed_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {record.vendor && (
                    <div>
                      <p className="text-slate-600">Provider</p>
                      <p className="font-semibold text-slate-900">{record.vendor}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-600">Cost</p>
                    <p className="font-semibold text-slate-900">
                      ${record.total_cost?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                {record.odometer_reading && (
                  <p className="text-xs text-slate-500 mt-3">
                    Odometer: {record.odometer_reading} miles
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(record)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(record)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Delete this maintenance record?')) {
                      onDelete(record.id);
                    }
                  }}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}