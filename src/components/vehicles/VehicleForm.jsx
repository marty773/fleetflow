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
import { X, Search, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { toast } from 'sonner';

export default function VehicleForm({ vehicle, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(vehicle || {
    name: '',
    type: 'truck',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vin: '',
    engine_type: 'unknown',
    engine_description: '',
    gvw: '',
    purchase_date: '',
    is_active: true,
    hydraulic_dump: false,
    chain_drive: false,
    center_tie_down_only: false,
    three_tie_down_bars: false,
    front_load_extension: false,
  });
  const [vinLoading, setVinLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleVinLookup = async () => {
    const cleanVin = (formData.vin || '').trim().toUpperCase();
    if (cleanVin.length !== 17) {
      toast.error('VIN must be 17 characters');
      return;
    }
    setVinLoading(true);
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleanVin}?format=json`);
      const data = await res.json();
      const r = data?.Results?.[0];
      if (r && r.Make) {
        const updates = {};
        if (r.Make) updates.make = r.Make;
        if (r.Model) updates.model = r.Model;
        if (r.ModelYear) updates.year = parseInt(r.ModelYear);
        // Engine info from NHTSA
        const engineDesc = [r.DisplacementL ? `${parseFloat(r.DisplacementL).toFixed(1)}L` : '', r.EngineCylinders ? `${r.EngineCylinders}-cyl` : '', r.EngineModel || ''].filter(Boolean).join(' ').trim();
        if (engineDesc) updates.engine_description = engineDesc;
        // Fuel type → engine_type
        const fuel = (r.FuelTypePrimary || '').toLowerCase();
        if (fuel.includes('diesel')) updates.engine_type = 'diesel';
        else if (fuel.includes('electric')) updates.engine_type = 'electric';
        else if (fuel.includes('hybrid')) updates.engine_type = 'hybrid';
        else if (fuel.includes('gas') || fuel.includes('gasoline') || fuel.includes('petrol')) updates.engine_type = 'gas';
        setFormData(prev => ({ ...prev, ...updates }));
        toast.success(`Found: ${r.ModelYear} ${r.Make} ${r.Model}`);
      } else {
        toast.error('No vehicle found for that VIN');
      }
    } catch {
      toast.error('VIN lookup failed');
    }
    setVinLoading(false);
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
                className="mt-2 select-text"
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <div className="mt-2">
                <ResponsiveSelect
                  value={formData.type}
                  onValueChange={(value) => handleChange('type', value)}
                  placeholder="Select type"
                  label="Type"
                >
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                </ResponsiveSelect>
              </div>
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
              <Label htmlFor="license_plate">License Plate</Label>
              <Input
                id="license_plate"
                placeholder="e.g., ABC-1234"
                value={formData.license_plate}
                onChange={(e) => handleChange('license_plate', e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="vin">VIN</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="vin"
                  placeholder="17-character VIN"
                  value={formData.vin}
                  onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                  maxLength={17}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVinLookup}
                  disabled={vinLoading || (formData.vin || '').trim().length !== 17}
                  className="shrink-0 gap-2"
                >
                  {vinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Look Up
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Auto-fills Make, Model, Year & Engine via NHTSA.</p>
            </div>

            <div>
              <Label>Engine Type</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {[{val:'gas',label:'Gas'},{val:'diesel',label:'Diesel'},{val:'electric',label:'Electric'},{val:'hybrid',label:'Hybrid'},{val:'unknown',label:'Unknown'}].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleChange('engine_type', opt.val)}
                    className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${formData.engine_type === opt.val ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="engine_description">Engine Description</Label>
              <Input
                id="engine_description"
                placeholder="e.g. 6.7L I6 Cummins Diesel"
                value={formData.engine_description || ''}
                onChange={(e) => handleChange('engine_description', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="gvw">GVW (lbs)</Label>
              <Input
                id="gvw"
                type="number"
                placeholder="Gross Vehicle Weight"
                value={formData.gvw}
                onChange={(e) => handleChange('gvw', e.target.value)}
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

            {formData.type === 'trailer' && (
            <div className="border-t pt-6">
              <Label className="text-base mb-4 block">Trailer Features</Label>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hydraulic_dump"
                    checked={formData.hydraulic_dump}
                    onCheckedChange={(checked) => handleChange('hydraulic_dump', checked)}
                  />
                  <label
                    htmlFor="hydraulic_dump"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Hydraulic Dump
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="chain_drive"
                    checked={formData.chain_drive}
                    onCheckedChange={(checked) => handleChange('chain_drive', checked)}
                  />
                  <label
                    htmlFor="chain_drive"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Chain Drive
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="center_tie_down_only"
                    checked={formData.center_tie_down_only}
                    onCheckedChange={(checked) => handleChange('center_tie_down_only', checked)}
                  />
                  <label
                    htmlFor="center_tie_down_only"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Center Tie Down Only
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="three_tie_down_bars"
                    checked={formData.three_tie_down_bars}
                    onCheckedChange={(checked) => handleChange('three_tie_down_bars', checked)}
                  />
                  <label
                    htmlFor="three_tie_down_bars"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Three Tie Down Bars
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="front_load_extension"
                    checked={formData.front_load_extension}
                    onCheckedChange={(checked) => handleChange('front_load_extension', checked)}
                  />
                  <label
                    htmlFor="front_load_extension"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Front Load Extension
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="self_adjusting_brakes"
                    checked={formData.self_adjusting_brakes}
                    onCheckedChange={(checked) => handleChange('self_adjusting_brakes', checked)}
                  />
                  <label
                    htmlFor="self_adjusting_brakes"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Self Adjusting Brakes
                  </label>
                </div>
              </div>
            </div>
            )}

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