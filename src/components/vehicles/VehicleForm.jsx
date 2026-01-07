import React, { useState } from 'react';
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

export default function VehicleForm({ vehicle, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(vehicle || {
    name: '',
    type: 'truck',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vin: '',
    purchase_date: '',
    is_active: true,
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
        <CardTitle>{vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</CardTitle>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-slate-100 rounded-lg transition"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Vehicle Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Truck #1, Trailer A"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                placeholder="e.g., Volvo, Peterbilt"
                value={formData.make}
                onChange={(e) => handleChange('make', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                placeholder="e.g., FH16, 379"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => handleChange('year', parseInt(e.target.value))}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="license_plate">License Plate *</Label>
              <Input
                id="license_plate"
                placeholder="e.g., ABC-1234"
                value={formData.license_plate}
                onChange={(e) => handleChange('license_plate', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                placeholder="Vehicle Identification Number"
                value={formData.vin}
                onChange={(e) => handleChange('vin', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? 'Saving...' : 'Save Vehicle'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}