import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { addMonths, format } from 'date-fns';

export default function IntervalForm({ interval, vehicles, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(interval || {
    vehicle_id: '',
    interval_name: '',
    maintenance_type: 'oil_change',
    interval_months: 6,
    interval_miles: '',
    last_performed_date: new Date().toISOString().split('T')[0],
    last_performed_mileage: '',
    next_due_date: '',
    next_due_mileage: '',
    notes: '',
  });

  // Calculate next due date and mileage
  useEffect(() => {
    const updates = {};
    
    if (formData.last_performed_date && formData.interval_months) {
      const nextDate = addMonths(
        new Date(formData.last_performed_date),
        parseInt(formData.interval_months)
      );
      updates.next_due_date = nextDate.toISOString().split('T')[0];
    }
    
    if (formData.last_performed_mileage && formData.interval_miles) {
      updates.next_due_mileage = parseFloat(formData.last_performed_mileage) + parseFloat(formData.interval_miles);
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [formData.last_performed_date, formData.interval_months, formData.last_performed_mileage, formData.interval_miles]);

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
        <CardTitle>{interval ? 'Edit Interval' : 'Create Maintenance Interval'}</CardTitle>
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
              <Label htmlFor="interval_name">Interval Name *</Label>
              <Input
                id="interval_name"
                placeholder="e.g., Oil Change"
                value={formData.interval_name}
                onChange={(e) => handleChange('interval_name', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="maintenance_type">Type *</Label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(value) => handleChange('maintenance_type', value)}
              >
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
              <Label htmlFor="interval_months">Interval (Months) *</Label>
              <Input
                id="interval_months"
                type="number"
                min="1"
                value={formData.interval_months}
                onChange={(e) => handleChange('interval_months', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="interval_miles">Interval (Miles)</Label>
              <Input
                id="interval_miles"
                type="number"
                placeholder="Optional"
                value={formData.interval_miles}
                onChange={(e) => handleChange('interval_miles', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="last_performed_date">Last Performed *</Label>
              <Input
                id="last_performed_date"
                type="date"
                value={formData.last_performed_date}
                onChange={(e) => handleChange('last_performed_date', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="last_performed_mileage">Last Odometer Reading</Label>
              <Input
                id="last_performed_mileage"
                type="number"
                placeholder="Miles"
                value={formData.last_performed_mileage}
                onChange={(e) => handleChange('last_performed_mileage', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="next_due_date">Next Due Date</Label>
              <Input
                id="next_due_date"
                type="date"
                value={formData.next_due_date}
                disabled
                className="mt-2 bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1">Auto-calculated</p>
            </div>

            <div>
              <Label htmlFor="next_due_mileage">Next Due Mileage</Label>
              <Input
                id="next_due_mileage"
                type="number"
                placeholder="Calculated from interval"
                value={formData.next_due_mileage}
                onChange={(e) => handleChange('next_due_mileage', e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.vehicle_id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save Interval'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}