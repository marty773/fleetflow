import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

export default function AppointmentForm({ appointment, vehicles, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(appointment || {
    vehicle_id: '',
    title: '',
    description: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    location: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{appointment ? 'Edit Appointment' : 'New Appointment'}</CardTitle>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-lg">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vehicle_id">Vehicle *</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => handleChange('vehicle_id', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.license_plate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Oil Change, Inspection"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="appointment_date">Date *</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => handleChange('appointment_date', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="appointment_time">Time</Label>
              <Input
                id="appointment_time"
                type="time"
                value={formData.appointment_time}
                onChange={(e) => handleChange('appointment_time', e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Joe's Auto Shop"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="mt-2 h-24"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.vehicle_id || !formData.title}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save Appointment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}