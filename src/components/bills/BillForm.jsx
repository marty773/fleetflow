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
import { X, Upload, Trash2, Plus, ChevronDown, Edit, ImageIcon, Loader2, Check, ChevronsUpDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function BillForm({ bill, vehicles, items = [], vendors = [], onSubmit, onCancel, isLoading }) {
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
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    vendor: '',
    price: '',
    quantity_on_hand: '0',
    low_stock_threshold: '2',
    item_number: '',
    description: '',
    photo_url: '',
  });
  const [creatingItem, setCreatingItem] = useState(false);
  const [itemSearchOpen, setItemSearchOpen] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.unit_price === 0) return;
    const total = newItem.quantity * newItem.unit_price;
    const lineItem = {
      description: newItem.description,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total,
      item_quantity: newItem.quantity
    };
    
    // Only include vehicle_id and item_id if they have values
    if (newItem.vehicle_id) {
      lineItem.vehicle_id = newItem.vehicle_id;
    }
    if (newItem.item_id) {
      lineItem.item_id = newItem.item_id;
    }
    
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, lineItem],
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
      if (file.type === 'application/pdf') {
        // First upload to temp storage, then move to Google Drive
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Pass the URL to the backend function to upload to Drive
        const response = await base44.functions.invoke('uploadToGoogleDrive', {
          fileUrl: file_url,
          fileName: file.name
        });
        
        handleChange('photo_url', response.data.preview_url);
        setPhotoPreview(response.data.preview_url);
      } else {
        // Upload image
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Use AI to crop and extract just the document/paper
        const { url: croppedUrl } = await base44.integrations.Core.GenerateImage({
          prompt: "Extract and crop only the document/receipt/paper from this image, removing all background and surroundings. The output should be a clean, straight, cropped scan of just the paper document with no background visible. Maintain the original text clarity.",
          existing_image_urls: [file_url]
        });
        
        handleChange('photo_url', croppedUrl);
        setPhotoPreview(croppedUrl);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
      e.preventDefault();
    }
  };

  const handlePhotoUploadNewItem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewItemData(prev => ({ ...prev, photo_url: file_url }));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCreateNewItem = async () => {
    if (!newItemData.name || !newItemData.price) return;
    
    setCreatingItem(true);
    try {
      const createdItem = await base44.entities.Item.create({
        name: newItemData.name,
        vendor: newItemData.vendor || null,
        price: parseFloat(newItemData.price),
        quantity_on_hand: parseFloat(newItemData.quantity_on_hand) || 0,
        low_stock_threshold: parseFloat(newItemData.low_stock_threshold) || 2,
        item_number: newItemData.item_number || null,
        description: newItemData.description || null,
        photo_url: newItemData.photo_url || null,
      });
      
      // Update items list and select the new item
      items.push(createdItem);
      setNewItem({
        ...newItem,
        item_id: createdItem.id,
        description: createdItem.name,
        unit_price: createdItem.price,
      });
      
      setShowNewItemDialog(false);
      setNewItemData({ name: '', vendor: '', price: '', quantity_on_hand: '0', low_stock_threshold: '2', item_number: '', description: '', photo_url: '' });
    } finally {
      setCreatingItem(false);
    }
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
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vendor">Vendor *</Label>
              {vendors.length > 0 ? (
                <Select value={formData.vendor} onValueChange={(value) => handleChange('vendor', value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
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
                  placeholder="e.g., Joe's Repair Shop"
                  value={formData.vendor}
                  onChange={(e) => handleChange('vendor', e.target.value)}
                  required
                  className="mt-2"
                />
              )}
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
              <Label htmlFor="bill_number">Invoice Number</Label>
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
                  {photoPreview.includes('drive.google.com') || photoPreview.toLowerCase().endsWith('.pdf') ? (
                    <div className="relative w-full border rounded-lg overflow-hidden">
                      <iframe
                        src={photoPreview.includes('drive.google.com') ? photoPreview : photoPreview}
                        className="w-full h-96"
                        title="PDF Preview"
                      />
                    </div>
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
                  <Select value={newItem.vehicle_id || ''} onValueChange={(value) => setNewItem({ ...newItem, vehicle_id: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vehicle (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.license_plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={itemSearchOpen}
                          className="flex-1 justify-between"
                        >
                          {newItem.item_id
                            ? items.find((item) => item.id === newItem.item_id)?.name
                            : "Stock Item (optional)"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search by name or part #..." />
                          <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  setNewItem({ ...newItem, item_id: '' });
                                  setItemSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !newItem.item_id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                None
                              </CommandItem>
                              {items.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.name} ${item.item_number || ''}`}
                                  onSelect={() => {
                                    setNewItem({ 
                                      ...newItem, 
                                      item_id: item.id,
                                      description: item.name,
                                      unit_price: item.price
                                    });
                                    setItemSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newItem.item_id === item.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{item.name}</span>
                                    {item.item_number && (
                                      <span className="text-xs text-slate-500">{item.item_number}</span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewItemDialog(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
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
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {item.item_id && (
                                <Package className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              )}
                              <span>{item.description}</span>
                            </div>
                          </TableCell>
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

        {/* New Item Dialog */}
        <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Add New Item</DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateNewItem(); }} className="space-y-5 mt-4">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Photo</Label>
                <div className="relative">
                  {newItemData.photo_url ? (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={newItemData.photo_url}
                        alt="Item preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={() => setNewItemData(prev => ({ ...prev, photo_url: '' }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      {photoUploading ? (
                        <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="h-10 w-10 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-600">Click to upload photo</span>
                          <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUploadNewItem}
                        disabled={photoUploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="new_item_name">Item Name *</Label>
                <Input
                  id="new_item_name"
                  value={newItemData.name}
                  onChange={e => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter item name"
                  required
                  className="h-11"
                />
              </div>

              {/* Vendor & Price Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_item_vendor">Vendor</Label>
                  {vendors.length > 0 ? (
                    <Select value={newItemData.vendor} onValueChange={e => setNewItemData(prev => ({ ...prev, vendor: e }))}>
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
                      id="new_item_vendor"
                      value={newItemData.vendor}
                      onChange={e => setNewItemData(prev => ({ ...prev, vendor: e.target.value }))}
                      placeholder="Vendor name"
                      className="h-11"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_item_price">Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <Input
                      id="new_item_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItemData.price}
                      onChange={e => setNewItemData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      className="h-11 pl-7"
                    />
                  </div>
                </div>
              </div>

              {/* Starting Inventory & Low Stock Threshold Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_item_quantity">Starting Inventory</Label>
                  <Input
                    id="new_item_quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={newItemData.quantity_on_hand}
                    onChange={e => setNewItemData(prev => ({ ...prev, quantity_on_hand: e.target.value }))}
                    placeholder="0"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_item_low_stock">Low Stock Alert</Label>
                  <Input
                    id="new_item_low_stock"
                    type="number"
                    min="0"
                    step="1"
                    value={newItemData.low_stock_threshold}
                    onChange={e => setNewItemData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                    placeholder="2"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Item Number */}
              <div className="space-y-2">
                <Label htmlFor="new_item_number">Item Number / SKU</Label>
                <Input
                  id="new_item_number"
                  value={newItemData.item_number}
                  onChange={e => setNewItemData(prev => ({ ...prev, item_number: e.target.value }))}
                  placeholder="e.g. SKU-12345"
                  className="h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="new_item_description">Description</Label>
                <Textarea
                  id="new_item_description"
                  value={newItemData.description}
                  onChange={e => setNewItemData(prev => ({ ...prev, description: e.target.value }))}
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
                  onClick={() => setShowNewItemDialog(false)}
                  disabled={creatingItem}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-amber-600 hover:bg-amber-700"
                  disabled={creatingItem || !newItemData.name || !newItemData.price}
                >
                  {creatingItem ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Item'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}