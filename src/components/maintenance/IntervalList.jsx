import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { Edit2, Trash2, AlertCircle, Check, Clock } from 'lucide-react';

export default function IntervalList({ intervals, vehicles, onEdit, onDelete, isDeleting }) {
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

  if (intervals.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600">No maintenance intervals scheduled yet</p>
        </CardContent>
      </Card>
    );
  }

  const getStatus = (interval) => {
    if (!interval.next_due_date) {
      return { label: 'Scheduled', icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-50' };
    }
    
    const days = differenceInDays(new Date(interval.next_due_date), new Date());
    if (days < 0) {
      return { label: 'Overdue', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (days <= 7) {
      return { label: 'Urgent', icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50' };
    } else if (days <= 30) {
      return { label: 'Due Soon', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    } else {
      return { label: 'Scheduled', icon: Check, color: 'text-green-600', bgColor: 'bg-green-50' };
    }
  };

  const sortedIntervals = [...intervals].sort((a, b) => {
    if (!a.next_due_date) return 1;
    if (!b.next_due_date) return -1;
    return new Date(a.next_due_date) - new Date(b.next_due_date);
  });

  return (
    <div className="space-y-4">
      {sortedIntervals.map((interval) => {
        const status = getStatus(interval);
        const StatusIcon = status.icon;
        return (
          <Card key={interval.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${status.bgColor}`}>
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">{interval.interval_name}</h3>
                    <Badge className={maintenanceColors[interval.maintenance_type]}>
                      {interval.maintenance_type?.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <Badge variant="secondary" className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-slate-600">Vehicle</p>
                      <p className="font-semibold text-slate-900">
                        {vehicleMap[interval.vehicle_id]?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Interval</p>
                      <p className="font-semibold text-slate-900">
                        Every {interval.interval_months} month{interval.interval_months > 1 ? 's' : ''}
                        {interval.interval_miles ? ` / ${interval.interval_miles} mi` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Last Done</p>
                      <p className="font-semibold text-slate-900">
                        {interval.last_performed_date ? format(new Date(interval.last_performed_date), 'MMM dd, yyyy') : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Next Due</p>
                      <p className="font-semibold text-slate-900">
                        {interval.next_due_date ? format(new Date(interval.next_due_date), 'MMM dd, yyyy') : 'Not calculated'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end md:justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(interval)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Delete this interval?')) {
                        onDelete(interval.id);
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
        );
      })}
    </div>
  );
}