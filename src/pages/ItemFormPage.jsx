import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

export default function ItemFormPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { data: allItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
    enabled: !!editId,
  });

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const vendors = allVendors.filter(v => v.company_id === selectedCompany);
  const editingItem = editId ? allItems.find(i => i.id === editId) || null : null;

  const [formData, setFormData] = useState({
    name: '', vendor: '', price: '', quantity_on_hand: '0',
    low_stock_threshold: '2', item_number: '', description: '', photo_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        vendor: editingItem.vendor || '',
        price: editingItem.price?.toString() || '',
        quantity_on_hand: editingItem.quantity_on_hand?.toString() || '0',
        low_stock_threshold: editingItem.low_stock_threshold?.toString() || '2',
        item_number: editingItem.item_number || '',
        description: editingItem.description || '',
        photo_url: editingItem.photo_url || '',
      });
    }
  }, [editingItem?.id]);

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
      company_id: selectedCompany,
    };
    if (editingItem?.id) {
      await base44.entities.Item.update(editingItem.id, data);
    } else {
      await base44.entities.Item.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['items'] });
    setSaving(false);
    navigate('/Items');
  };

  if (editId && itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
        <div className="max-w-2xl mx-auto px-4 pt-14 lg:pt-0">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            {editId ? 'Edit Item' : 'Add Item'}
          </h1>
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Photo</Label>
                {formData.photo_url ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img src={formData.photo_url} alt="Item preview" className="w-full h-full object-cover" />
                    <Button
                      type="button" size="icon" variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                    {uploading ? <Loader2 className="h-8 w-8 text-slate-400 animate-spin" /> : (
                      <>
                        <ImageIcon className="h-10 w-10 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Click to upload photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Enter item name" required className="h-11 select-text" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  {vendors.length > 0 ? (
                    <Select value={formData.vendor} onValueChange={v => setFormData(p => ({ ...p, vendor: v }))}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {vendors.map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={formData.vendor} onChange={e => setFormData(p => ({ ...p, vendor: e.target.value }))} placeholder="Vendor name" className="h-11 select-text" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <Input type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className="h-11 pl-7 select-text" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Starting Inventory</Label>
                  <Input type="number" min="0" value={formData.quantity_on_hand} onChange={e => setFormData(p => ({ ...p, quantity_on_hand: e.target.value }))} placeholder="0" className="h-11 select-text" />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert</Label>
                  <Input type="number" min="0" value={formData.low_stock_threshold} onChange={e => setFormData(p => ({ ...p, low_stock_threshold: e.target.value }))} placeholder="2" className="h-11 select-text" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Item Number / SKU</Label>
                <Input value={formData.item_number} onChange={e => setFormData(p => ({ ...p, item_number: e.target.value }))} placeholder="e.g. SKU-12345" className="h-11 select-text" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Item description..." rows={3} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => navigate('/Items')}>Cancel</Button>
                <Button type="submit" className="flex-1 h-11 bg-amber-600 hover:bg-amber-700" disabled={saving || !formData.name}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}