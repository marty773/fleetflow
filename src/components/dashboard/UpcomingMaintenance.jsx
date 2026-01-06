import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { AlertCircle, Clock, Wrench } from 'lucide-react';

export default function UpcomingMaintenance({ intervals, vehicles }) {
  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const getStatus = (dueDate) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-800' };
    } else if (days <= 7) {
      return { label: 'Urgent', color: 'bg-orange-100 text-orange-800' };
    } else if (days <= 30) {
      return { label: 'Due Soon', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'Scheduled', color: 'bg-green-100 text-green-800' };
  };

  const activeIntervals = intervals.filter(i => i.is_active);
  const urgentIntervals = activeIntervals
    .filter(i => differenceInDays(new Date(i.next_due_date), new Date()) <= 30)
    .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date))
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          Upcoming Services
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {urgentIntervals.length > 0 ? (
          <div className="space-y-3">
            {urgentIntervals.map((interval) => {
              const status = getStatus(interval.next_due_date);
              return (
                <div key={interval.id} className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{interval.name}</p>
                      <p className="text-xs text-slate-600">
                        {vehicleMap[interval.vehicle_id]?.name}
                      </p>
                    </div>
                    <Badge className={status.color} variant="secondary">
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Due: {format(new Date(interval.next_due_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-600">No upcoming services</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}