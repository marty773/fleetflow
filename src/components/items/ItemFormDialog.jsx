import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

export default function ItemFormDialog({ open, onOpenChange, item, onSave, vendors = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    price: '',
    quantity_on_hand: '',
    low_stock_threshold: '2',
    item_number: '',
    description: '',
    photo_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        vendor: item.vendor || '',
        price: item.price?.toString() || '',
        quantity_on_hand: item.quantity_on_hand?.toString() || '0',
        low_stock_threshold: item.low_stock_threshold?.toString() || '2',
        item_number: item.item_number || '',
        description: item.description || '',
        photo_url: item.photo_url || '',
      });
    } else {
      setFormData({
        name: '',
        vendor: '',
        price: '',
        quantity_on_hand: '0',
        low_stock_threshold: '2',
        item_number: '',
        description: '',
        photo_url: '',
      });
    }
  }, [item, open]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, photo_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      name: formData.name,
      vendor: formData.vendor || null,
      price: formData.price ? parseFloat(formData.price) : null,
      quantity_on_hand: formData.quantity_on_hand ? parseFloat(formData.quantity_on_hand) : 0,
      low_stock_threshold: formData.low_stock_threshold ? parseFloat(formData.low_stock_threshold) : 2,
      item_number: formData.item_number || null,
      description: formData.description || null,
      photo_url: formData.photo_url || null,
    };

    if (item?.id) {
      await base44.entities.Item.update(item.id, data);
    } else {
      await base44.entities.Item.create(data);
    }

    setSaving(false);
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="relative">
              {formData.photo_url ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img
                    src={formData.photo_url}
                    alt="Item preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-slate-400 dark:text-slate-500 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-2" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Click to upload photo</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">PNG, JPG up to 10MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter item name"
              required
              className="h-11 select-text"
            />
          </div>

          {/* Vendor & Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              {vendors.length > 0 ? (
                <Select value={formData.vendor} onValueChange={e => setFormData(prev => ({ ...prev, vendor: e }))}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.name}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={e => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                  placeholder="Vendor name"
                  className="h-11 select-text"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">$</span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  className="h-11 pl-7 select-text"
                />
              </div>
            </div>
          </div>

          {/* Starting Inventory & Low Stock Threshold Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_on_hand">Starting Inventory</Label>
              <Input
                id="quantity_on_hand"
                type="number"
                min="0"
                step="1"
                value={formData.quantity_on_hand}
                onChange={e => setFormData(prev => ({ ...prev, quantity_on_hand: e.target.value }))}
                placeholder="0"
                className="h-11 select-text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                step="1"
                value={formData.low_stock_threshold}
                onChange={e => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                placeholder="2"
                className="h-11 select-text"
              />
            </div>
          </div>

          {/* Item Number */}
          <div className="space-y-2">
            <Label htmlFor="item_number">Item Number / SKU</Label>
            <Input
              id="item_number"
              value={formData.item_number}
              onChange={e => setFormData(prev => ({ ...prev, item_number: e.target.value }))}
              placeholder="e.g. SKU-12345"
              className="h-11 select-text"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Item description..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 bg-amber-600 hover:bg-amber-700"
              disabled={saving || !formData.name}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : item ? (
                'Update Item'
              ) : (
                'Add Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}