import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { X } from 'lucide-react';

export default function ItemForm({ item, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(item || {
    name: '',
    price: '',
    category: 'other',
    description: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price),
    });
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{item ? 'Edit Item' : 'Add New Item'}</CardTitle>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-lg">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Oil Filter"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="mt-2 select-text"
              />
            </div>

            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <ResponsiveSelect
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
                placeholder="Select category"
                options={[
                  { value: 'fuel', label: 'Fuel' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'repairs', label: 'Repairs' },
                  { value: 'parts', label: 'Parts' },
                  { value: 'labor', label: 'Labor' },
                  { value: 'other', label: 'Other' }
                ]}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="mt-2 select-text"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name || !formData.price}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isLoading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}