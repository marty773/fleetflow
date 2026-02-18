import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Edit2, Truck, Package, CheckCircle, XCircle, History, Plus, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaintenanceForm from '../maintenance/MaintenanceForm';

export default function VehicleViewDialog({ vehicle, open, onOpenChange, onEdit }) {
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const queryClient = useQueryClient();

  // Fetch maintenance records for this vehicle
  const { data: allMaintenanceRecords = [] } = useQuery({
    queryKey: ['maintenance-records'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-performed_date'),
    enabled: open,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
    enabled: open && showAddMaintenance,
  });

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
    enabled: open && showAddMaintenance,
  });

  const maintenanceRecords = vehicle 
    ? allMaintenanceRecords.filter(r => r.vehicle_id === vehicle.id)
    : [];

  const createMaintenanceMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      setShowAddMaintenance(false);
      toast.success('Maintenance record added');
    },
  });

  const handleMaintenanceSubmit = async (data) => {
    // Deduct inventory for parts used
    if (data.parts_used && data.parts_used.length > 0) {
      for (const part of data.parts_used) {
        const item = allItems.find(i => i.id === part.item_id);
        if (item) {
          const newQuantity = (item.quantity_on_hand || 0) - part.quantity_used;
          await base44.entities.Item.update(part.item_id, {
            quantity_on_hand: Math.max(0, newQuantity)
          });
        }
      }
    }
    
    createMaintenanceMutation.mutate({ ...data, vehicle_id: vehicle.id });
  };

  if (!vehicle) return null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getCategoryColor = (type) => {
    const colors = {
      oil_change: 'bg-blue-100 text-blue-800',
      filter_change: 'bg-purple-100 text-purple-800',
      tire_rotation: 'bg-orange-100 text-orange-800',
      inspection: 'bg-green-100 text-green-800',
      repair: 'bg-red-100 text-red-800',
      cleaning: 'bg-cyan-100 text-cyan-800',
      other: 'bg-slate-100 text-slate-800',
    };
    return colors[type] || colors.other;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 p-6">
          <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{vehicle.name}</DialogTitle>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {vehicle.make} {vehicle.model} • {vehicle.year}
              </p>
            </div>
            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 dark:text-slate-200">
              {vehicle.type === 'truck' ? (
                <Truck className="w-4 h-4 mr-1" />
              ) : (
                <Package className="w-4 h-4 mr-1" />
              )}
              {vehicle.type}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">
              <FileText className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Maintenance History ({maintenanceRecords.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-slate-500 dark:text-slate-400">Make</Label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{vehicle.make}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-500 dark:text-slate-400">Model</Label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{vehicle.model}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-500 dark:text-slate-400">Year</Label>
              <p className="text-base font-medium text-slate-900 dark:text-white">{vehicle.year}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-500 dark:text-slate-400">Status</Label>
              <div className="flex items-center gap-2">
                {vehicle.is_active ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-base font-medium text-green-600">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-base font-medium text-slate-400">Inactive</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* License Plate with Copy */}
          <div className="space-y-1">
            <Label className="text-slate-500 dark:text-slate-400">License Plate</Label>
            <div className="flex items-center gap-2">
              <p className="text-base font-mono font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded border dark:border-slate-700 flex-1">
                {vehicle.license_plate}
              </p>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(vehicle.license_plate, 'License plate')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* VIN with Copy */}
          {vehicle.vin && (
            <div className="space-y-1">
              <Label className="text-slate-500 dark:text-slate-400">VIN Number</Label>
              <div className="flex items-center gap-2">
                <p className="text-base font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded border dark:border-slate-700 flex-1">
                  {vehicle.vin}
                </p>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(vehicle.vin, 'VIN')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            {vehicle.gvw && (
              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400">GVW</Label>
                <p className="text-base font-medium text-slate-900 dark:text-white">{vehicle.gvw.toLocaleString()} lbs</p>
              </div>
            )}
            {vehicle.purchase_date && (
              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400">Purchase Date</Label>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {format(new Date(vehicle.purchase_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Trailer Features */}
          {vehicle.type === 'trailer' && (
            <div className="space-y-2">
              <Label className="text-slate-500 dark:text-slate-400">Features</Label>
              <div className="flex flex-wrap gap-2">
                {vehicle.hydraulic_dump && (
                  <Badge variant="secondary">Hydraulic Dump</Badge>
                )}
                {vehicle.chain_drive && (
                  <Badge variant="secondary">Chain Drive</Badge>
                )}
                {vehicle.center_tie_down_only && (
                  <Badge variant="secondary">Center Tie Down Only</Badge>
                )}
                {vehicle.three_tie_down_bars && (
                  <Badge variant="secondary">Three Tie Down Bars</Badge>
                )}
                {vehicle.front_load_extension && (
                  <Badge variant="secondary">Front Load Extension</Badge>
                )}
                {!vehicle.hydraulic_dump &&
                  !vehicle.chain_drive &&
                  !vehicle.center_tie_down_only &&
                  !vehicle.three_tie_down_bars &&
                  !vehicle.front_load_extension && (
                    <span className="text-sm text-slate-500">No features specified</span>
                  )}
              </div>
            </div>
          )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            {/* Add Maintenance Form */}
            {showAddMaintenance ? (
              <div className="border dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Maintenance Record</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAddMaintenance(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <MaintenanceForm
                  record={null}
                  vehicles={[vehicle]}
                  items={allItems}
                  vendors={allVendors}
                  onSubmit={handleMaintenanceSubmit}
                  onCancel={() => setShowAddMaintenance(false)}
                  isLoading={createMaintenanceMutation.isPending}
                  hideVehicleSelector={true}
                />
              </div>
            ) : (
              <Button 
                onClick={() => setShowAddMaintenance(true)}
                className="w-full bg-slate-900 hover:bg-slate-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Maintenance Record
              </Button>
            )}

            {/* Maintenance History List */}
            {maintenanceRecords.length > 0 ? (
              <div className="space-y-3">
                {maintenanceRecords.map((record) => (
                  <div 
                    key={record.id} 
                    className="border dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-base text-slate-900 dark:text-white">{record.title}</h4>
                          <Badge className={getCategoryColor(record.maintenance_type)}>
                            {record.maintenance_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(record.performed_date), 'MMM dd, yyyy')}
                          </div>
                          {record.vendor && (
                            <span>• {record.vendor}</span>
                          )}
                          {record.odometer_reading && (
                            <span>• {record.odometer_reading} miles</span>
                          )}
                        </div>
                      </div>
                      {record.total_cost && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">
                            ${record.total_cost.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Work Items */}
                    {record.work_items && record.work_items.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <Label className="text-xs text-slate-500 dark:text-slate-400">Work Performed:</Label>
                        {record.work_items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 p-2 rounded">
                            <span>
                              {item.description} 
                              {item.quantity > 1 && ` (×${item.quantity})`}
                            </span>
                            {item.total && (
                              <span className="font-medium">${item.total.toFixed(2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Parts Used */}
                    {record.parts_used && record.parts_used.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <Label className="text-xs text-slate-500 dark:text-slate-400">Parts Used:</Label>
                        {record.parts_used.map((part, idx) => {
                          const item = allItems.find(i => i.id === part.item_id);
                          return (
                            <div key={idx} className="flex justify-between text-sm bg-blue-50 dark:bg-blue-950 text-slate-900 dark:text-slate-200 p-2 rounded">
                              <span>
                                {item?.name || 'Unknown Item'} (×{part.quantity_used})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Notes */}
                    {record.notes && (
                      <div className="mt-3">
                        <Label className="text-xs text-slate-500">Notes:</Label>
                        <p className="text-sm text-slate-700 mt-1">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !showAddMaintenance && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <History className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 mb-4">No maintenance history yet</p>
                <p className="text-sm text-slate-500">
                  Add past service records to track this vehicle's maintenance history
                </p>
              </div>
            )}
            </TabsContent>
            </Tabs>
            </div>

            {/* Actions - Floating Bottom */}
            <div className="sticky bottom-0 flex gap-3 p-6 bg-white border-t border-slate-200 flex-wrap sm:flex-nowrap">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
            </Button>
            <Button onClick={() => onEdit(vehicle)} className="flex-1 bg-slate-900 hover:bg-slate-800">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Vehicle
            </Button>
            </div>
            </DialogContent>
            </Dialog>
            );
            }