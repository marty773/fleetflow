import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wrench } from 'lucide-react';
import { format } from 'date-fns';

export default function UpcomingMaintenance({ intervals, vehicles }) {
  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const getMaintenanceStatus = (dueDate) => {
    const days = (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (days < 0) return { label: 'Overdue', color: 'bg-red-100 text-red-800' };
    if (days <= 7) return { label: 'Urgent', color: 'bg-orange-100 text-orange-800' };
    if (days <= 30) return { label: 'Due Soon', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Scheduled', color: 'bg-green-100 text-green-800' };
  };

  const maintenanceColors = {
    oil_change: 'bg-blue-100 text-blue-800',
    filter_change: 'bg-yellow-100 text-yellow-800',
    tire_rotation: 'bg-purple-100 text-purple-800',
    inspection: 'bg-indigo-100 text-indigo-800',
    repair: 'bg-red-100 text-red-800',
    cleaning: 'bg-green-100 text-green-800',
    other: 'bg-slate-100 text-slate-800',
  };

  const upcomingIntervals = intervals
    .filter(i => i.is_active)
    .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date))
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Upcoming Services
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {upcomingIntervals.length > 0 ? (
            upcomingIntervals.map(interval => {
              const status = getMaintenanceStatus(interval.next_due_date);
              return (
                <div key={interval.id} className="p-4 border-b hover:bg-slate-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{interval.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {vehicleMap[interval.vehicle_id]?.name}
                      </p>
                    </div>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={maintenanceColors[interval.maintenance_type]}>
                      {interval.maintenance_type?.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-slate-600">
                      {format(new Date(interval.next_due_date), 'MMM dd')}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No upcoming services</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}