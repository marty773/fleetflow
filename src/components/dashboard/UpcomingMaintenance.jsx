import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, CheckCircle2 } from 'lucide-react';

export default function UpcomingMaintenance({ intervals, vehicles, onSelectInterval, onMarkComplete }) {
  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const sortedIntervals = intervals
    .filter(i => i.next_due_date && new Date(i.next_due_date) <= in30Days)
    .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));

  const getUrgency = (dueDate) => {
    const days = (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (days < 0) return { label: 'Overdue', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' };
    if (days <= 7) return { label: 'Urgent', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' };
    if (days <= 30) return { label: 'Due Soon', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' };
    return { label: 'Scheduled', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' };
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <CardTitle className="text-slate-900 dark:text-white">Maintenance Due</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {sortedIntervals.length > 0 ? (
          <div className="space-y-3">
            {sortedIntervals.map((interval) => {
              const urgency = getUrgency(interval.next_due_date);
              const vehicle = vehicleMap[interval.vehicle_id];
              return (
                <div
                  key={interval.id}
                  className="flex items-start gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => onSelectInterval?.(interval)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{interval.interval_name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{vehicle?.name}</p>
                      </div>
                      <Badge className={`ml-2 shrink-0 ${urgency.color}`}>{urgency.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(interval.next_due_date + 'T12:00:00'), 'MMM dd, yyyy')}
                    </div>
                  </button>
                  {onMarkComplete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-green-400 text-green-700 hover:bg-green-50 gap-1 mt-0.5"
                      onClick={() => onMarkComplete(interval)}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Complete</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No scheduled maintenance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}