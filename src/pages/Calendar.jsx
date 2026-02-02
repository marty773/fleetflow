import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '../components/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, AlertCircle, Wrench } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, startOfWeek, endOfWeek, addDays } from 'date-fns';

export default function Calendar() {
  const { selectedCompany } = useCompany();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: allIntervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const intervals = allIntervals.filter(i => i.company_id === selectedCompany);

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const filteredIntervals = selectedVehicle === 'all'
    ? intervals
    : intervals.filter(i => i.vehicle_id === selectedVehicle);

  // Get all days in the current month plus padding for full weeks
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for each day
  const eventsMap = useMemo(() => {
    const map = {};
    filteredIntervals.forEach(interval => {
      if (interval.next_due_date) {
        const dueDate = new Date(interval.next_due_date);
        const dateKey = dueDate.toISOString().split('T')[0];
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(interval);
      }
    });
    return map;
  }, [filteredIntervals]);

  const getDayEvents = (day) => {
    const dateKey = day.toISOString().split('T')[0];
    return eventsMap[dateKey] || [];
  };

  const getEventStatus = (interval) => {
    const days = (new Date(interval.next_due_date) - new Date()) / (1000 * 60 * 60 * 24);
    if (days < 0) return 'overdue';
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'dueSoon';
    return 'scheduled';
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

  const statusColors = {
    overdue: 'bg-red-100 border-l-4 border-red-500',
    urgent: 'bg-orange-100 border-l-4 border-orange-500',
    dueSoon: 'bg-yellow-100 border-l-4 border-yellow-500',
    scheduled: 'bg-green-100 border-l-4 border-green-500',
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Maintenance Calendar</h1>
            <p className="text-slate-600 mt-2">Schedule and track upcoming maintenance</p>
          </div>
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Day labels */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayLabels.map(day => (
                    <div key={day} className="text-center font-semibold text-slate-700 text-sm py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map(day => {
                    const events = getDayEvents(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        className={`min-h-24 p-2 border rounded-lg cursor-pointer transition-all ${
                          isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50'
                        } ${isToday ? 'border-blue-500 border-2' : 'border-slate-200'}`}
                      >
                        <p className={`text-sm font-semibold mb-1 ${
                          isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                        }`}>
                          {format(day, 'd')}
                        </p>
                        <div className="space-y-1">
                          {events.slice(0, 2).map(event => {
                            const status = getEventStatus(event);
                            return (
                              <div
                                key={event.id}
                                className={`text-xs px-1 py-0.5 rounded truncate ${
                                  maintenanceColors[event.maintenance_type]
                                }`}
                                title={event.interval_name}
                                >
                                {event.interval_name}
                              </div>
                            );
                          })}
                          {events.length > 2 && (
                            <p className="text-xs text-slate-500 px-1">
                              +{events.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events Sidebar */}
          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Upcoming Services</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 max-h-96 overflow-y-auto">
                {filteredIntervals.filter(i => i.next_due_date).length > 0 ? (
                  [...filteredIntervals]
                    .filter(i => i.next_due_date)
                    .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date))
                    .slice(0, 10)
                    .map(interval => {
                      const status = getEventStatus(interval);
                      return (
                        <div
                          key={interval.id}
                          className={`p-3 rounded-lg ${statusColors[status]}`}
                        >
                          <p className="font-semibold text-sm text-slate-900 mb-1">
                            {interval.interval_name}
                          </p>
                          <p className="text-xs text-slate-600 mb-2">
                            {vehicleMap[interval.vehicle_id]?.name}
                          </p>
                          <p className="text-xs text-slate-700">
                            {format(new Date(interval.next_due_date), 'MMM dd, yyyy')}
                          </p>
                          {status === 'overdue' && (
                            <div className="flex items-center gap-1 mt-1 text-red-600">
                              <AlertCircle className="w-3 h-3" />
                              <span className="text-xs font-semibold">Overdue</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-6">
                    <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No scheduled services</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Day View Dialog */}
        {selectedDay && (
          <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Events for {format(selectedDay, 'MMMM d, yyyy')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {getDayEvents(selectedDay).length > 0 ? (
                  getDayEvents(selectedDay).map(event => {
                    const status = getEventStatus(event);
                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg ${statusColors[status]}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">{event.interval_name}</h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {vehicleMap[event.vehicle_id]?.name}
                            </p>
                          </div>
                          <Badge className={maintenanceColors[event.maintenance_type]}>
                            {event.maintenance_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        {event.interval_months && (
                          <p className="text-sm text-slate-600">
                            Every {event.interval_months} months
                          </p>
                        )}
                        {event.interval_miles && (
                          <p className="text-sm text-slate-600">
                            Every {event.interval_miles} miles
                          </p>
                        )}
                        {status === 'overdue' && (
                          <div className="flex items-center gap-1 mt-2 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-semibold">Overdue</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No events scheduled for this day</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDay(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}