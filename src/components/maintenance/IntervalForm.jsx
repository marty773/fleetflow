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

export default function IntervalForm({ interval, vehicles, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    vehicle_id: interval?.vehicle_id || '',
    interval_name: interval?.interval_name || '',
    maintenance_type: interval?.maintenance_type || 'oil_change',
    interval_months: interval?.interval_months || 3,
    interval_miles: interval?.interval_miles || '',
    last_performed_date: interval?.last_performed_date || '',
    last_performed_mileage: interval?.last_performed_mileage || '',
    notes: interval?.notes || '',
  });

  useEffect(() => {
    if (interval) {
      setFormData({
        vehicle_id: interval.vehicle_id || '',
        interval_name: interval.interval_name || '',
        maintenance_type: interval.maintenance_type || 'oil_change',
        interval_months: interval.interval_months || 3,
        interval_miles: interval.interval_miles || '',
        last_performed_date: interval.last_performed_date || '',
        last_performed_mileage: interval.last_performed_mileage || '',
        notes: interval.notes || '',
      });
    }
  }, [interval]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateNextDue = () => {
    const data = { ...formData };
    
    // Calculate next due date
    if (data.last_performed_date && data.interval_months) {
      const lastDate = new Date(data.last_performed_date);
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + parseInt(data.interval_months));
      data.next_due_date = nextDate.toISOString().split('T')[0];
    }

    // Calculate next due mileage
    if (data.last_performed_mileage && data.interval_miles) {
      data.next_due_mileage = parseFloat(data.last_performed_mileage) + parseFloat(data.interval_miles);
    }

    return data;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submissionData = calculateNextDue();
    onSubmit(submissionData);
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{interval ? 'Edit Interval' : 'Create Maintenance Interval'}</CardTitle>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
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
                placeholder="e.g., Oil Change Every 3 Months"
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
              <Label htmlFor="interval_months">Repeat Every (Months) *</Label>
              <Input
                id="interval_months"
                type="number"
                min="1"
                placeholder="e.g., 3"
                value={formData.interval_months}
                onChange={(e) => handleChange('interval_months', e.target.value)}
                required
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">How often this maintenance should occur</p>
            </div>

            <div>
              <Label htmlFor="interval_miles">Or Every (Miles) - Optional</Label>
              <Input
                id="interval_miles"
                type="number"
                min="1"
                placeholder="e.g., 3000"
                value={formData.interval_miles}
                onChange={(e) => handleChange('interval_miles', e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Leave empty if not mileage-based</p>
            </div>

            <div>
              <Label htmlFor="last_performed_date">Last Performed Date *</Label>
              <Input
                id="last_performed_date"
                type="date"
                value={formData.last_performed_date}
                onChange={(e) => handleChange('last_performed_date', e.target.value)}
                required
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">When was this maintenance last done?</p>
            </div>

            <div>
              <Label htmlFor="last_performed_mileage">Last Odometer Reading - Optional</Label>
              <Input
                id="last_performed_mileage"
                type="number"
                placeholder="Miles"
                value={formData.last_performed_mileage}
                onChange={(e) => handleChange('last_performed_mileage', e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Odometer reading at last maintenance</p>
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
              disabled={isLoading || !formData.vehicle_id || !formData.interval_name}
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