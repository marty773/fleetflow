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
import { addMonths } from 'date-fns';

export default function IntervalForm({ interval, vehicles, onSubmit, onCancel, isLoading }) {
  const getInitialType = () => {
    if (interval) {
      return interval.interval_months ? 'months' : 'miles';
    }
    return 'months';
  };

  const [intervalType, setIntervalType] = useState(getInitialType());
  const [formData, setFormData] = useState({
    vehicle_id: interval?.vehicle_id || '',
    interval_name: interval?.interval_name || '',
    maintenance_type: interval?.maintenance_type || 'oil_change',
    interval_months: interval?.interval_months || '',
    interval_miles: interval?.interval_miles || '',
    last_performed_date: interval?.last_performed_date || '',
    last_performed_mileage: interval?.last_performed_mileage || '',
    next_due_date: interval?.next_due_date || '',
    next_due_mileage: interval?.next_due_mileage || '',
    notes: interval?.notes || '',
  });

  // Auto-calculate next due
  useEffect(() => {
    if (intervalType === 'months' && formData.last_performed_date && formData.interval_months) {
      const nextDate = addMonths(new Date(formData.last_performed_date), parseInt(formData.interval_months));
      setFormData(prev => ({ ...prev, next_due_date: nextDate.toISOString().split('T')[0] }));
    }
  }, [intervalType, formData.last_performed_date, formData.interval_months]);

  useEffect(() => {
    if (intervalType === 'miles' && formData.last_performed_mileage && formData.interval_miles) {
      const nextMileage = parseFloat(formData.last_performed_mileage) + parseFloat(formData.interval_miles);
      setFormData(prev => ({ ...prev, next_due_mileage: nextMileage }));
    }
  }, [intervalType, formData.last_performed_mileage, formData.interval_miles]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (newType) => {
    setIntervalType(newType);
    // Clear opposite type fields
    if (newType === 'months') {
      setFormData(prev => ({
        ...prev,
        interval_miles: '',
        last_performed_mileage: '',
        next_due_mileage: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        interval_months: '',
        last_performed_date: '',
        next_due_date: '',
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cleanData = {
      vehicle_id: formData.vehicle_id,
      interval_name: formData.interval_name,
      maintenance_type: formData.maintenance_type,
      notes: formData.notes || null,
    };
    
    if (intervalType === 'months') {
      cleanData.interval_months = formData.interval_months ? parseFloat(formData.interval_months) : null;
      cleanData.last_performed_date = formData.last_performed_date || null;
      cleanData.next_due_date = formData.next_due_date || null;
      cleanData.interval_miles = null;
      cleanData.last_performed_mileage = null;
      cleanData.next_due_mileage = null;
    } else {
      cleanData.interval_miles = formData.interval_miles ? parseFloat(formData.interval_miles) : null;
      cleanData.last_performed_mileage = formData.last_performed_mileage ? parseFloat(formData.last_performed_mileage) : null;
      cleanData.next_due_mileage = formData.next_due_mileage ? parseFloat(formData.next_due_mileage) : null;
      cleanData.interval_months = null;
      cleanData.last_performed_date = null;
      cleanData.next_due_date = null;
    }
    
    onSubmit(cleanData);
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
              <Label htmlFor="interval_type">Interval Based On *</Label>
              <Select value={intervalType} onValueChange={handleTypeChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="months">Time (Months)</SelectItem>
                  <SelectItem value="miles">Mileage (Miles)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {intervalType === 'months' && (
              <>
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
              </>
            )}

            {intervalType === 'miles' && (
              <>
                <div>
                  <Label htmlFor="interval_miles">Interval (Miles) *</Label>
                  <Input
                    id="interval_miles"
                    type="number"
                    min="1"
                    value={formData.interval_miles}
                    onChange={(e) => handleChange('interval_miles', e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="last_performed_mileage">Last Odometer Reading *</Label>
                  <Input
                    id="last_performed_mileage"
                    type="number"
                    placeholder="Miles"
                    value={formData.last_performed_mileage}
                    onChange={(e) => handleChange('last_performed_mileage', e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="next_due_mileage">Next Due Mileage</Label>
                  <Input
                    id="next_due_mileage"
                    type="number"
                    placeholder="Calculated from interval"
                    value={formData.next_due_mileage}
                    disabled
                    className="mt-2 bg-slate-50"
                  />
                  <p className="text-xs text-slate-500 mt-1">Auto-calculated</p>
                </div>
              </>
            )}
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