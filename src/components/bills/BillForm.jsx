import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, Loader2 } from 'lucide-react';

export default function BillForm({ bill, vehicles, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(bill || {
    vehicle_id: '',
    vendor: '',
    bill_date: new Date().toISOString().split('T')[0],
    bill_number: '',
    category: 'fuel',
    items: [],
    total_amount: 0,
    photo_url: '',
    notes: '',
  });
  const [uploading, setUploading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('photo_url', file_url);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total_amount: parseFloat(formData.total_amount),
    });
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{bill ? 'Edit Bill' : 'Create New Bill'}</CardTitle>
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
              <Label htmlFor="vendor">Vendor *</Label>
              <Input
                id="vendor"
                placeholder="e.g., Shell Gas Station"
                value={formData.vendor}
                onChange={(e) => handleChange('vendor', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="bill_date">Bill Date *</Label>
              <Input
                id="bill_date"
                type="date"
                value={formData.bill_date}
                onChange={(e) => handleChange('bill_date', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="bill_number">Bill Number</Label>
              <Input
                id="bill_number"
                placeholder="Optional invoice number"
                value={formData.bill_number}
                onChange={(e) => handleChange('bill_number', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repairs">Repairs</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="tolls">Tolls</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="total_amount">Total Amount *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.total_amount}
                onChange={(e) => handleChange('total_amount', e.target.value)}
                required
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this bill"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <div>
            <Label>Bill Photo</Label>
            <div className="mt-2">
              {formData.photo_url ? (
                <div className="relative bg-slate-100 rounded-lg p-4">
                  <img src={formData.photo_url} alt="Bill" className="max-h-48 rounded-lg" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleChange('photo_url', '')}
                    className="mt-2"
                  >
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-slate-50">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm font-medium text-slate-600">Upload bill photo</span>
                      <span className="text-xs text-slate-500">PNG, JPG up to 10MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPhoto}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading || uploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || uploading || !formData.vehicle_id || !formData.vendor}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isLoading ? 'Saving...' : bill ? 'Update Bill' : 'Create Bill'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}