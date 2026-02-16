import React, { useState } from 'react';
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
import { X, Plus, Trash2, Edit, Package } from 'lucide-react';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
import ResponsiveSelect from '@/components/ResponsiveSelect';

export default function MaintenanceForm({ record, vehicles, items = [], vendors = [], onSubmit, onCancel, isLoading }) {
  // When editing, merge parts_used back into work_items so they show correctly
  const initializeFormData = () => {
    if (!record) {
      return {
        vehicle_id: '',
        maintenance_type: 'oil_change',
        title: '',
        performed_date: new Date().toISOString().split('T')[0],
        vendor: '',
        work_items: [],
        parts_used: [],
        total_cost: 0,
        odometer_reading: '',
        notes: '',
      };
    }
    
    // Build a map of item_id -> quantity from parts_used
    const partsUsedMap = {};
    if (record.parts_used) {
      record.parts_used.forEach(part => {
        partsUsedMap[part.item_id] = part.quantity_used;
      });
    }
    
    // Reconstruct work_items with item_id from parts_used
    const workItems = (record.work_items || []).map(item => {
      const workItem = {
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      };
      
      // Check if this work item corresponds to a part in parts_used
      // Match by quantity and see if we can find a corresponding item
      for (const [itemId, qty] of Object.entries(partsUsedMap)) {
        if (qty === item.quantity) {
          workItem.item_id = itemId;
          delete partsUsedMap[itemId]; // Remove so we don't match it twice
          break;
        }
      }
      
      return workItem;
    });
    
    return {
      ...record,
      work_items: workItems
    };
  };
  
  const [formData, setFormData] = useState(initializeFormData());

  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    item_id: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.unit_price < 0) return;
    const total = newItem.quantity * newItem.unit_price;
    const workItem = {
      description: newItem.description,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total
    };
    
    // Only include item_id if it has a value
    if (newItem.item_id) {
      workItem.item_id = newItem.item_id;
    }
    
    setFormData(prev => ({
      ...prev,
      work_items: [...prev.work_items, workItem],
    }));
    setNewItem({ description: '', quantity: 1, unit_price: 0, item_id: '' });
  };

  const handleRemoveItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      work_items: prev.work_items.filter((_, i) => i !== idx),
    }));
  };

  const handleEditItem = (idx) => {
    const item = formData.work_items[idx];
    setNewItem({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_id: item.item_id || '',
    });
    handleRemoveItem(idx);
  };

  const calculateTotal = () => {
    return formData.work_items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = calculateTotal();
    
    // Build parts_used from work_items that have item_id
    const partsUsedForSubmission = formData.work_items
      .filter(item => item.item_id && item.quantity > 0)
      .map(item => ({ item_id: item.item_id, quantity_used: item.quantity }));

    // Keep item_id on work_items for proper display later
    const workItemsForSubmission = formData.work_items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      ...(item.item_id && { item_id: item.item_id })
    }));

    onSubmit({ 
      ...formData, 
      work_items: workItemsForSubmission,
      total_cost: total, 
      parts_used: partsUsedForSubmission 
    });
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{record ? 'Edit Maintenance' : 'Log Maintenance'}</CardTitle>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-lg">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="vehicle_id">Vehicle *</Label>
                <div className="mt-2">
                  <ResponsiveSelect
                    value={formData.vehicle_id}
                    onValueChange={(value) => handleChange('vehicle_id', value)}
                    placeholder="Select vehicle"
                    label="Vehicle"
                  >
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.license_plate})
                      </SelectItem>
                    ))}
                  </ResponsiveSelect>
                </div>
              </div>

            <div>
              <Label htmlFor="maintenance_type">Type *</Label>
              <div className="mt-2">
                <ResponsiveSelect
                  value={formData.maintenance_type}
                  onValueChange={(value) => handleChange('maintenance_type', value)}
                  placeholder="Select maintenance type"
                  label="Type"
                >
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="filter_change">Filter Change</SelectItem>
                  <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </ResponsiveSelect>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Regular Service"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                className="mt-2 select-text"
              />
            </div>

            <div>
              <Label htmlFor="performed_date">Date Performed *</Label>
              <Input
                id="performed_date"
                type="date"
                value={formData.performed_date}
                onChange={(e) => handleChange('performed_date', e.target.value)}
                required
                className="mt-2 select-text"
              />
            </div>

            <div>
              <Label htmlFor="vendor">Service Provider</Label>
              {vendors.length > 0 ? (
                <div className="mt-2">
                  <ResponsiveSelect
                    value={formData.vendor}
                    onValueChange={(value) => handleChange('vendor', value)}
                    placeholder="Select service provider"
                    label="Service Provider"
                  >
                    <SelectItem value={null}>None</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.name}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </ResponsiveSelect>
                </div>
              ) : (
                <Input
                  id="vendor"
                  placeholder="Shop name"
                  value={formData.vendor}
                  onChange={(e) => handleChange('vendor', e.target.value)}
                  className="mt-2 select-text"
                />
              )}
            </div>

            <div>
              <Label htmlFor="odometer">Odometer Reading</Label>
              <Input
                id="odometer"
                type="number"
                placeholder="Miles"
                value={formData.odometer_reading}
                onChange={(e) => handleChange('odometer_reading', e.target.value)}
                className="mt-2 select-text"
              />
            </div>
          </div>

          {/* Work Items */}
          <div>
            <Label className="mb-3 block">Work Performed</Label>
            <div className="space-y-3 mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Input
                placeholder="Work description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="select-text"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                  className="select-text"
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                  className="select-text"
                />
              </div>
              <div className="border-t dark:border-slate-700 pt-3 mt-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Optional: Select from Stock Items</p>
                <ResponsiveSelect
                  value={newItem.item_id || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setNewItem({ ...newItem, item_id: '' });
                    } else {
                      const selectedItem = items.find(i => i.id === value);
                      setNewItem({ 
                        ...newItem, 
                        item_id: value,
                        description: selectedItem?.name || newItem.description,
                        unit_price: selectedItem?.price || newItem.unit_price
                      });
                    }
                  }}
                  placeholder="Stock Item (optional)"
                  label="Stock Item"
                >
                  <SelectItem value="none">None</SelectItem>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - ${item.price?.toFixed(2) || '0.00'}
                    </SelectItem>
                  ))}
                </ResponsiveSelect>
              </div>
              <Button type="button" onClick={handleAddItem} variant="outline" size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>

            {formData.work_items.length > 0 && (
              <div className="border dark:border-slate-700 rounded-lg overflow-hidden mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800">
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.work_items.map((item, idx) => (
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
                    ))}
                    <TableRow className="bg-slate-50 dark:bg-slate-800 font-semibold">
                      <TableCell colSpan={3}>Total:</TableCell>
                      <TableCell>${calculateTotal().toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="mt-2 h-20 select-text"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.vehicle_id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}