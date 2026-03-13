import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ChevronLeft, ChevronRight, AlertCircle, Wrench, Calendar as CalendarIcon, Plus, Clock, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { toast } from 'sonner';
import AppointmentForm from '../components/calendar/AppointmentForm';
import SyncDialog from '../components/calendar/SyncDialog';

export default function Calendar() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);
  const [companyCalendarConnected, setCompanyCalendarConnected] = useState(false);
  const [userCalendarConnected, setUserCalendarConnected] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserSyncDialog, setShowUserSyncDialog] = useState(false);
  const [showCompanySyncDialog, setShowCompanySyncDialog] = useState(false);
  const [companyCalendars, setCompanyCalendars] = useState([]);
  const [isSyncingUser, setIsSyncingUser] = useState(false);
  const [isSyncingCompany, setIsSyncingCompany] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Check if user calendar is connected
  React.useEffect(() => {
    if (currentUser) {
      base44.entities.UserCalendarAuth.filter({ user_email: currentUser.email })
        .then(auths => setUserCalendarConnected(auths && auths.length > 0))
        .catch(() => setUserCalendarConnected(false));
    }
  }, [currentUser]);

  // Check if company calendar is connected
  React.useEffect(() => {
    base44.entities.CompanyCalendarAuth.filter({ company_id: selectedCompany })
      .then(auths => setCompanyCalendarConnected(auths && auths.length > 0))
      .catch(() => setCompanyCalendarConnected(false));
  }, [selectedCompany]);

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: allIntervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['calendarAppointments'],
    queryFn: () => base44.entities.CalendarAppointment.list(),
  });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const intervals = allIntervals.filter(i => i.company_id === selectedCompany);
  const appointments = allAppointments.filter(a => a.company_id === selectedCompany);

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const filteredIntervals = selectedVehicle === 'all'
    ? intervals
    : intervals.filter(i => i.vehicle_id === selectedVehicle);

  const filteredAppointments = selectedVehicle === 'all'
    ? appointments
    : appointments.filter(a => a.vehicle_id === selectedVehicle);

  // Get all days in the current month plus padding for full weeks
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for each day (intervals + appointments)
  // scheduled_date overrides next_due_date when set
  const getIntervalCalendarDate = (interval) => interval.scheduled_date || interval.next_due_date;

  const eventsMap = useMemo(() => {
    const map = {};
    
    // Add maintenance intervals — use scheduled_date if set, else next_due_date
    filteredIntervals.forEach(interval => {
      const calDate = interval.scheduled_date || interval.next_due_date;
      if (calDate) {
        const dateKey = calDate;
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push({ ...interval, type: 'interval' });
      }
    });
    
    // Add appointments
    filteredAppointments.forEach(appointment => {
      const dateKey = appointment.appointment_date;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push({ ...appointment, type: 'appointment' });
    });
    
    return map;
  }, [filteredIntervals, filteredAppointments]);

  const getDayEvents = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return eventsMap[dateKey] || [];
  };

  const getEventStatus = (interval) => {
    const calDate = interval.scheduled_date || interval.next_due_date;
    const days = (new Date(calDate + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24);
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



  const handleConnectUserCalendar = async () => {
    try {
      const result = await base44.functions.invoke('authorizeUserCalendar', {});
      window.open(result.data.authUrl, '_blank', 'width=600,height=700');
    } catch (error) {
      toast.error('Failed to start authorization');
    }
  };

  const handleConnectCompanyCalendar = async () => {
    try {
      const result = await base44.functions.invoke('authorizeCompanyCalendar', { company_id: selectedCompany });
      window.open(result.data.authUrl, '_blank', 'width=600,height=700');
    } catch (error) {
      toast.error('Failed to start authorization');
    }
  };

  const handleOpenUserSync = () => {
    if (!userCalendarConnected) {
      toast.error('Please connect your calendar first');
      return;
    }
    setShowUserSyncDialog(true);
  };

  const handleOpenCompanySync = async () => {
    if (!companyCalendarConnected) {
      toast.error('Please connect company calendar first');
      return;
    }
    // Fetch available calendars
    try {
      const result = await base44.functions.invoke('listCompanyCalendars', { company_id: selectedCompany });
      setCompanyCalendars(result.data.calendars || []);
      setShowCompanySyncDialog(true);
    } catch (error) {
      toast.error('Failed to load calendars');
    }
  };

  const handleSyncUserCalendar = async ({ futureOnly, calendarId }) => {
    setIsSyncingUser(true);
    try {
      const result = await base44.functions.invoke('syncUserMaintenanceToCalendar', {
        futureOnly,
        calendarId
      });
      toast.success(result.data.message);
      setShowUserSyncDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to sync');
    } finally {
      setIsSyncingUser(false);
    }
  };

  const handleSyncCompanyCalendar = async ({ futureOnly, calendarId }) => {
    setIsSyncingCompany(true);
    try {
      const result = await base44.functions.invoke('syncCompanyCalendar', {
        company_id: selectedCompany,
        futureOnly,
        calendarId
      });
      toast.success(result.data.message);
      setShowCompanySyncDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to sync');
    } finally {
      setIsSyncingCompany(false);
    }
  };

  const [reschedulingInterval, setReschedulingInterval] = React.useState(null);
  const [rescheduleDate, setRescheduleDate] = React.useState('');

  const updateIntervalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceInterval.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      setReschedulingInterval(null);
      setRescheduleDate('');
      toast.success('Schedule date updated');
    },
  });

  const handleReschedule = (interval) => {
    setReschedulingInterval(interval.id);
    setRescheduleDate(interval.scheduled_date || interval.next_due_date || '');
  };

  const handleSaveReschedule = (intervalId) => {
    updateIntervalMutation.mutate({ id: intervalId, data: { scheduled_date: rescheduleDate || null } });
  };

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarAppointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarAppointments'] });
      setShowAppointmentForm(false);
      setEditingAppointment(null);
      toast.success('Appointment created');
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarAppointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarAppointments'] });
      setShowAppointmentForm(false);
      setEditingAppointment(null);
      toast.success('Appointment updated');
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarAppointment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarAppointments'] });
      toast.success('Appointment deleted');
    },
  });

  const handleSubmitAppointment = (data) => {
    const dataWithCompany = { ...data, company_id: selectedCompany };
    if (editingAppointment) {
      updateAppointmentMutation.mutate({ id: editingAppointment.id, data: dataWithCompany });
    } else {
      createAppointmentMutation.mutate(dataWithCompany);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 pt-14 lg:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Maintenance Calendar</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Schedule and track upcoming maintenance</p>
              </div>
            <Button
              onClick={() => {
                setEditingAppointment(null);
                setShowAppointmentForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" /> New Appointment
            </Button>
          </div>
          
          <div className="flex flex-col gap-3">
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="w-full sm:w-64 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showAppointmentForm && (
          <AppointmentForm
            appointment={editingAppointment}
            vehicles={vehicles}
            onSubmit={handleSubmitAppointment}
            onCancel={() => {
              setShowAppointmentForm(false);
              setEditingAppointment(null);
            }}
            isLoading={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
               <CardHeader className="border-b border-slate-200 dark:border-slate-700 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={prevMonth}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <CardTitle className="text-slate-900 dark:text-white">{format(currentDate, 'MMMM yyyy')}</CardTitle>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
              <CardContent className="p-6">
                {/* Day labels */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {dayLabels.map(day => (
                    <div key={day} className="text-center font-semibold text-slate-700 dark:text-slate-400 text-sm py-2">
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
                           isCurrentMonth ? 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900' : 'bg-slate-50 dark:bg-slate-900'
                         } ${isToday ? 'border-blue-500 border-2' : 'border-slate-200 dark:border-slate-700'}`}
                       >
                        <p className={`text-sm font-semibold mb-1 ${
                           isCurrentMonth ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                         }`}>
                          {format(day, 'd')}
                        </p>
                        <div className="space-y-1">
                          {events.slice(0, 2).map(event => {
                            if (event.type === 'appointment') {
                              return (
                                <div
                                  key={event.id}
                                  className="text-xs px-1 py-0.5 rounded truncate bg-indigo-100 text-indigo-800"
                                  title={event.title}
                                >
                                  📅 {event.title}
                                </div>
                              );
                            } else {
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
                            }
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
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-lg text-slate-900 dark:text-white">Upcoming Services</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 max-h-96 overflow-y-auto">
                {(filteredIntervals.filter(i => i.next_due_date).length > 0 || filteredAppointments.length > 0) ? (
                  [
                    ...filteredIntervals.filter(i => i.next_due_date || i.scheduled_date).map(i => ({ ...i, type: 'interval', sortDate: new Date((i.scheduled_date || i.next_due_date) + 'T12:00:00') })),
                    ...filteredAppointments.map(a => ({ ...a, type: 'appointment', sortDate: new Date(a.appointment_date) }))
                  ]
                    .sort((a, b) => a.sortDate - b.sortDate)
                    .slice(0, 10)
                    .map(item => {
                      if (item.type === 'appointment') {
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-lg bg-indigo-100 border-l-4 border-indigo-500"
                          >
                            <p className="font-semibold text-sm text-slate-900 mb-1">
                              📅 {item.title}
                            </p>
                            <p className="text-xs text-slate-600 mb-2">
                              {vehicleMap[item.vehicle_id]?.name}
                            </p>
                            <p className="text-xs text-slate-700">
                              {format(new Date(item.appointment_date), 'MMM dd, yyyy')}
                              {item.appointment_time && ` at ${item.appointment_time}`}
                            </p>
                            {item.location && (
                              <p className="text-xs text-slate-600 mt-1">
                                📍 {item.location}
                              </p>
                            )}
                          </div>
                        );
                      } else {
                        const status = getEventStatus(item);
                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg ${statusColors[status]}`}
                          >
                            <p className="font-semibold text-sm text-slate-900 mb-1">
                              {item.interval_name}
                            </p>
                            <p className="text-xs text-slate-600 mb-2">
                              {vehicleMap[item.vehicle_id]?.name}
                            </p>
                            <p className="text-xs text-slate-700">
                              {format(new Date((item.scheduled_date || item.next_due_date) + 'T12:00:00'), 'MMM dd, yyyy')}
                              {item.scheduled_date && <span className="ml-1 text-blue-600">📌</span>}
                            </p>
                            {status === 'overdue' && (
                              <div className="flex items-center gap-1 mt-1 text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-xs font-semibold">Overdue</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                    })
                ) : (
                  <div className="text-center py-6">
                    <Wrench className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">No scheduled services</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sync Dialogs */}
        <SyncDialog
          open={showUserSyncDialog}
          onOpenChange={setShowUserSyncDialog}
          onSync={handleSyncUserCalendar}
          isLoading={isSyncingUser}
          syncType="user"
        />

        <SyncDialog
          open={showCompanySyncDialog}
          onOpenChange={setShowCompanySyncDialog}
          onSync={handleSyncCompanyCalendar}
          isLoading={isSyncingCompany}
          syncType="company"
          availableCalendars={companyCalendars}
        />

        {/* Day View Dialog */}
        {selectedDay && (
          <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-white">Events for {format(selectedDay, 'MMMM d, yyyy')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {getDayEvents(selectedDay).length > 0 ? (
                  getDayEvents(selectedDay).map(event => {
                    if (event.type === 'appointment') {
                      return (
                        <div
                          key={event.id}
                          className="p-4 rounded-lg bg-indigo-100 border-l-4 border-indigo-500"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-slate-900">📅 {event.title}</h3>
                              <p className="text-sm text-slate-600 mt-1">
                                {vehicleMap[event.vehicle_id]?.name}
                              </p>
                            </div>
                            <Badge className="bg-indigo-200 text-indigo-900">Appointment</Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-slate-700 mb-2">{event.description}</p>
                          )}
                          {event.appointment_time && (
                            <div className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                              <Clock className="w-4 h-4" />
                              {event.appointment_time}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </div>
                          )}
                          {event.notes && (
                            <p className="text-xs text-slate-500 mt-2">{event.notes}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAppointment(event);
                                setShowAppointmentForm(true);
                                setSelectedDay(null);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Delete this appointment?')) {
                                  deleteAppointmentMutation.mutate(event.id);
                                  setSelectedDay(null);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    } else {
                      const status = getEventStatus(event);
                      const calDate = event.scheduled_date || event.next_due_date;
                      const isRescheduling = reschedulingInterval === event.id;
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
                         {event.scheduled_date && (
                           <p className="text-xs text-blue-700 font-medium mt-1">📌 Pinned to {format(new Date(event.scheduled_date + 'T12:00:00'), 'MMM dd, yyyy')}</p>
                         )}
                         {status === 'overdue' && (
                           <div className="flex items-center gap-1 mt-2 text-red-600">
                             <AlertCircle className="w-4 h-4" />
                             <span className="text-sm font-semibold">Overdue</span>
                           </div>
                         )}
                         {/* Reschedule control */}
                         {isRescheduling ? (
                           <div className="mt-3 flex items-center gap-2">
                             <input
                               type="date"
                               value={rescheduleDate}
                               onChange={e => setRescheduleDate(e.target.value)}
                               className="border border-slate-300 rounded px-2 py-1 text-sm flex-1"
                             />
                             <Button size="sm" onClick={() => handleSaveReschedule(event.id)} disabled={updateIntervalMutation.isPending}>
                               Save
                             </Button>
                             <Button size="sm" variant="outline" onClick={() => setReschedulingInterval(null)}>
                               Cancel
                             </Button>
                             {event.scheduled_date && (
                               <Button size="sm" variant="ghost" className="text-slate-500 text-xs"
                                 onClick={() => updateIntervalMutation.mutate({ id: event.id, data: { scheduled_date: null } })}>
                                 Clear pin
                               </Button>
                             )}
                           </div>
                         ) : (
                           <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => handleReschedule(event)}>
                             📌 {event.scheduled_date ? 'Change scheduled date' : 'Pin to a date'}
                           </Button>
                         )}
                       </div>
                      );
                    }
                  })
                ) : (
                  <div className="text-center py-8">
                    <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-slate-500 dark:text-slate-400">No events scheduled for this day</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={() => {
                    setEditingAppointment(null);
                    setShowAppointmentForm(true);
                    setSelectedDay(null);
                  }}
                  className="flex-1"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appointment
                </Button>
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