import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function MaintenanceForm({ record, vehicles, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(record || {
    vehicle_id: '',
    maintenance_type: 'oil_change',
    title: '',
    performed_date: new Date().toISOString().split('T')[0],
    vendor: '',
    items: [],
    total_cost: 0,
    odometer_reading: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total_cost: parseFloat(formData.total_cost),
      odometer_reading: formData.odometer_reading ? parseInt(formData.odometer_reading) : null,
    });
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{record ? 'Edit Maintenance Record' : 'Log Maintenance'}</CardTitle>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-lg">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vehicle_id">Vehicle *</Label>
              <Select value={formData.vehicle_id} onValueChange={(value) => handleChange('vehicle_id', value)}>
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
              <Label htmlFor="maintenance_type">Type *</Label>
              <Select value={formData.maintenance_type} onValueChange={(value) => handleChange('maintenance_type', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="filter_change">Filter Change</SelectItem>
                  <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Routine Oil Change"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="performed_date">Date Performed *</Label>
              <Input
                id="performed_date"
                type="date"
                value={formData.performed_date}
                onChange={(e) => handleChange('performed_date', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                placeholder="Service provider name"
                value={formData.vendor}
                onChange={(e) => handleChange('vendor', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="total_cost">Total Cost *</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.total_cost}
                onChange={(e) => handleChange('total_cost', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="odometer_reading">Odometer Reading</Label>
              <Input
                id="odometer_reading"
                type="number"
                placeholder="Miles"
                value={formData.odometer_reading}
                onChange={(e) => handleChange('odometer_reading', e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this maintenance"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="mt-2"
              rows={3}
            />
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
              {isLoading ? 'Saving...' : record ? 'Update Record' : 'Log Maintenance'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}