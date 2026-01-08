import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
import { X, Upload, Trash2, Plus, ChevronDown, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function BillForm({ bill, vehicles, items = [], onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(bill || {
    vendor: '',
    bill_date: new Date().toISOString().split('T')[0],
    bill_number: '',
    category: 'maintenance',
    line_items: [],
    total_amount: 0,
    photo_url: '',
    notes: '',
  });

  const [photoPreview, setPhotoPreview] = useState(bill?.photo_url || '');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    vehicle_id: '',
    item_id: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.unit_price <= 0) return;
    const total = newItem.quantity * newItem.unit_price;
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { ...newItem, total, item_quantity: newItem.quantity }],
    }));
    setNewItem({ description: '', quantity: 1, unit_price: 0, vehicle_id: '', item_id: '' });
  };

  const handleRemoveItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== idx),
    }));
  };

  const handleEditItem = (idx) => {
    const item = formData.line_items[idx];
    setNewItem({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vehicle_id: item.vehicle_id || '',
      item_id: item.item_id || '',
    });
    handleRemoveItem(idx);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('photo_url', file_url);
      setPhotoPreview(file_url);
    } finally {
      setPhotoUploading(false);
    }
  };

  const calculateTotal = () => {
    return formData.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = calculateTotal();
    onSubmit({ ...formData, total_amount: total });
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
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vendor">Vendor *</Label>
              <Input
                id="vendor"
                placeholder="e.g., Joe's Repair Shop"
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
                placeholder="Invoice #"
                value={formData.bill_number}
                onChange={(e) => handleChange('bill_number', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
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
          </div>

          {/* Photo/PDF Upload */}
          <div>
            <Label>Bill Photo or PDF</Label>
            <div className="mt-2">
              {photoPreview ? (
                <div className="relative inline-block">
                  {photoPreview.toLowerCase().endsWith('.pdf') ? (
                    <a
                      href={photoPreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 h-40 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-blue-600 hover:bg-slate-100"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="font-medium">View PDF</span>
                    </a>
                  ) : (
                    <img
                      src={photoPreview}
                      alt="Bill preview"
                      className="h-40 rounded-lg object-cover border"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview('');
                      handleChange('photo_url', '');
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-slate-50">
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                    <span className="text-sm text-slate-600">Click to upload bill photo or PDF</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handlePhotoUpload}
                    disabled={photoUploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <Label className="mb-3 block">Line Items</Label>
            <div className="space-y-3 mb-4 p-4 bg-slate-50 rounded-lg">
              <Input
                placeholder="Item description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  placeholder="Unit Price"
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Optional: Link to Vehicle or Stock Item</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newItem.vehicle_id} onValueChange={(value) => setNewItem({ ...newItem, vehicle_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vehicle (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.license_plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newItem.item_id} onValueChange={(value) => {
                    const selectedItem = items.find(i => i.id === value);
                    setNewItem({ 
                      ...newItem, 
                      item_id: value,
                      description: selectedItem?.name || newItem.description,
                      unit_price: selectedItem?.price || newItem.unit_price
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Stock Item (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddItem}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>

            {formData.line_items.length > 0 && (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.line_items.map((item, idx) => {
                      const linkedVehicle = vehicles.find(v => v.id === item.vehicle_id);
                      const linkedItem = items.find(i => i.id === item.item_id);
                      return (
                        <TableRow key={idx}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                          <TableCell>${item.total.toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{linkedVehicle?.name || '-'}</TableCell>
                          <TableCell className="text-sm">{linkedItem ? `${linkedItem.name} (+${item.item_quantity})` : '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(idx)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell colSpan={3}>Total:</TableCell>
                      <TableCell>${calculateTotal().toFixed(2)}</TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="mt-2 h-24"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || formData.line_items.length === 0}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isLoading ? 'Saving...' : 'Save Bill'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}