import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { AlertCircle, Calendar } from 'lucide-react';

export default function UpcomingMaintenance({ intervals, vehicles }) {
  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const sortedIntervals = intervals
    .filter(i => i.is_active)
    .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date))
    .slice(0, 5);

  const getUrgency = (dueDate) => {
    const days = (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (days < 0) return { label: 'Overdue', color: 'bg-red-100 text-red-800' };
    if (days <= 7) return { label: 'Urgent', color: 'bg-orange-100 text-orange-800' };
    if (days <= 30) return { label: 'Due Soon', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Maintenance Due</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {sortedIntervals.length > 0 ? (
          <div className="space-y-3">
            {sortedIntervals.map((interval) => {
              const urgency = getUrgency(interval.next_due_date);
              const vehicle = vehicleMap[interval.vehicle_id];
              return (
                <div key={interval.id} className="p-3 border rounded-lg hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">{interval.name}</p>
                      <p className="text-xs text-slate-500">{vehicle?.name}</p>
                    </div>
                    <Badge className={urgency.color}>{urgency.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(interval.next_due_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No scheduled maintenance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}