import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import MaintenanceForm from '../components/maintenance/MaintenanceForm';
import MaintenanceList from '../components/maintenance/MaintenanceList';
import IntervalForm from '../components/maintenance/IntervalForm';
import IntervalList from '../components/maintenance/IntervalList';
import { format } from 'date-fns';

export default function Maintenance() {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showIntervalForm, setShowIntervalForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingInterval, setEditingInterval] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('records');
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const { data: records = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: intervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const createRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
      setShowRecordForm(false);
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
      setEditingRecord(null);
      setShowRecordForm(false);
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
    },
  });

  const createIntervalMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceInterval.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      setShowIntervalForm(false);
      setEditingInterval(null);
    },
    onError: (error) => {
      console.error('Create interval error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Failed to create interval: ' + (error?.message || JSON.stringify(error)));
    },
  });

  const updateIntervalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceInterval.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      setEditingInterval(null);
      setShowIntervalForm(false);
    },
  });

  const deleteIntervalMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceInterval.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
    },
  });

  const handleSubmitRecord = async (data) => {
    // Deduct inventory for parts used
    if (data.parts_used && data.parts_used.length > 0) {
      for (const part of data.parts_used) {
        const currentItem = items.find(i => i.id === part.item_id);
        if (currentItem) {
          const newQty = (currentItem.quantity_on_hand || 0) - part.quantity_used;
          await base44.entities.Item.update(part.item_id, { quantity_on_hand: Math.max(0, newQty) });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }

    if (editingRecord) {
      await updateRecordMutation.mutateAsync({ id: editingRecord.id, data });
    } else {
      await createRecordMutation.mutateAsync(data);
    }

    // Update related maintenance intervals
    const relatedIntervals = intervals.filter(
      interval => interval.vehicle_id === data.vehicle_id && interval.maintenance_type === data.maintenance_type
    );

    for (const interval of relatedIntervals) {
      const updateData = {
        last_performed_date: data.performed_date,
      };

      if (data.odometer_reading) {
        updateData.last_performed_mileage = parseFloat(data.odometer_reading);
        if (interval.interval_miles) {
          updateData.next_due_mileage = parseFloat(data.odometer_reading) + parseFloat(interval.interval_miles);
        }
      }

      if (interval.interval_months) {
        const nextDate = new Date(data.performed_date);
        nextDate.setMonth(nextDate.getMonth() + parseInt(interval.interval_months));
        updateData.next_due_date = nextDate.toISOString().split('T')[0];
      }

      await base44.entities.MaintenanceInterval.update(interval.id, updateData);
    }

    queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
  };

  const handleSubmitInterval = async (data) => {
    try {
      if (editingInterval) {
        await updateIntervalMutation.mutateAsync({ id: editingInterval.id, data });
      } else {
        await createIntervalMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Failed to save interval:', error);
      alert('Failed to save interval: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Maintenance</h1>
            <p className="text-slate-600 mt-2">Track maintenance records and scheduled intervals</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border-b rounded-none">
            <TabsTrigger value="records">Maintenance Records</TabsTrigger>
            <TabsTrigger value="intervals">Scheduled Intervals</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-6">
            <div className="flex justify-end mb-6">
              <Button
                onClick={() => {
                  setEditingRecord(null);
                  setShowRecordForm(!showRecordForm);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Log Maintenance
              </Button>
            </div>

            {showRecordForm && (
              <MaintenanceForm
                record={editingRecord}
                vehicles={vehicles}
                items={items}
                onSubmit={handleSubmitRecord}
                onCancel={() => {
                  setShowRecordForm(false);
                  setEditingRecord(null);
                }}
                isLoading={createRecordMutation.isPending || updateRecordMutation.isPending}
              />
            )}

            <MaintenanceList
              records={records}
              vehicles={vehicles}
              items={items}
              onView={setViewingRecord}
              onEdit={(record) => {
                setEditingRecord(record);
                setShowRecordForm(true);
              }}
              onDelete={(id) => deleteRecordMutation.mutate(id)}
              isDeleting={deleteRecordMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="intervals" className="mt-6">
            <div className="flex justify-end mb-6">
              <Button
                onClick={() => {
                  setEditingInterval(null);
                  setShowIntervalForm(!showIntervalForm);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Interval
              </Button>
            </div>

            {showIntervalForm && (
              <IntervalForm
                interval={editingInterval}
                vehicles={vehicles}
                onSubmit={handleSubmitInterval}
                onCancel={() => {
                  setShowIntervalForm(false);
                  setEditingInterval(null);
                }}
                isLoading={createIntervalMutation.isPending || updateIntervalMutation.isPending}
              />
            )}

            <IntervalList
              intervals={intervals}
              vehicles={vehicles}
              onEdit={(interval) => {
                setEditingInterval(interval);
                setShowIntervalForm(true);
              }}
              onDelete={(id) => deleteIntervalMutation.mutate(id)}
              isDeleting={deleteIntervalMutation.isPending}
            />
          </TabsContent>
          </Tabs>

          {/* View Maintenance Dialog */}
          {viewingRecord && (
          <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Maintenance Record Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Vehicle</Label>
                    <p className="font-medium">{vehicles.find(v => v.id === viewingRecord.vehicle_id)?.name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Type</Label>
                    <p className="font-medium capitalize">{viewingRecord.maintenance_type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Title</Label>
                    <p className="font-medium">{viewingRecord.title}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Date</Label>
                    <p className="font-medium">{format(new Date(viewingRecord.performed_date), 'MMM dd, yyyy')}</p>
                  </div>
                  {viewingRecord.vendor && (
                    <div>
                      <Label className="text-slate-500">Service Provider</Label>
                      <p className="font-medium">{viewingRecord.vendor}</p>
                    </div>
                  )}
                  {viewingRecord.odometer_reading && (
                    <div>
                      <Label className="text-slate-500">Odometer</Label>
                      <p className="font-medium">{viewingRecord.odometer_reading} miles</p>
                    </div>
                  )}
                </div>
                {viewingRecord.work_items && viewingRecord.work_items.length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Work Performed</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left p-2">Description</th>
                            <th className="text-center p-2">Qty</th>
                            <th className="text-right p-2">Price</th>
                            <th className="text-right p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingRecord.work_items.map((item, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2">{item.description}</td>
                              <td className="text-center p-2">{item.quantity}</td>
                              <td className="text-right p-2">${item.unit_price?.toFixed(2)}</td>
                              <td className="text-right p-2">${item.total?.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="border-t bg-slate-50 font-semibold">
                            <td colSpan={3} className="p-2 text-right">Total:</td>
                            <td className="text-right p-2">${viewingRecord.total_cost?.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {viewingRecord.notes && (
                  <div>
                    <Label className="text-slate-500">Notes</Label>
                    <p className="text-sm mt-1">{viewingRecord.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setViewingRecord(null)}>Close</Button>
                <Button onClick={() => {
                  setEditingRecord(viewingRecord);
                  setViewingRecord(null);
                  setShowRecordForm(true);
                }}>
                  Edit Record
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
          </div>
          </div>
          );
          }