import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MaintenanceForm from '../components/maintenance/MaintenanceForm';
import MaintenanceList from '../components/maintenance/MaintenanceList';
import IntervalForm from '../components/maintenance/IntervalForm';
import IntervalList from '../components/maintenance/IntervalList';

export default function Maintenance() {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showIntervalForm, setShowIntervalForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingInterval, setEditingInterval] = useState(null);
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
    // Update item quantities from parts used
    const partUpdates = data.parts_used || [];

    for (const part of partUpdates) {
      const currentItem = items.find(i => i.id === part.item_id);
      if (currentItem) {
        const newQty = Math.max(0, (currentItem.quantity_on_hand || 0) - part.quantity_used);
        base44.entities.Item.update(part.item_id, { quantity_on_hand: newQty });
      }
    }

    if (editingRecord) {
      updateRecordMutation.mutate({ id: editingRecord.id, data });
    } else {
      createRecordMutation.mutate(data);
    }
  };

  const handleSubmitInterval = (data) => {
    if (editingInterval) {
      updateIntervalMutation.mutate({ id: editingInterval.id, data });
    } else {
      createIntervalMutation.mutate(data);
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
      </div>
    </div>
  );
}