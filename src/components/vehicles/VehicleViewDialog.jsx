import React, { useState } from 'react';
import PartsNeededReport from '@/components/reports/PartsNeededReport';
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
import { Copy, Edit2, Truck, Package, CheckCircle, XCircle, History, Plus, FileText, Calendar, Radio, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import FleetMap from './FleetMap';
import MotiveLivePanel from './MotiveLivePanel';

export default function VehicleViewDialog({ vehicle, open, onOpenChange, onEdit }) {
  const navigate = useNavigate();
  const [showPartsReport, setShowPartsReport] = useState(false);
  const queryClient = useQueryClient();

  // Fetch motive live data for this vehicle
  const { data: motiveData, isLoading: motiveLoading } = useQuery({
    queryKey: ['motive-vehicle-data'],
    queryFn: async () => {
      const res = await base44.functions.invoke('fetchMotiveVehicleData', {});
      return res.data;
    },
    enabled: open,
    refetchInterval: 60000,
  });

  const motiveVehicle = vehicle && motiveData?.vehicles
    ? motiveData.vehicles.find(v =>
        (vehicle.vin && v.vin && vehicle.vin === v.vin) ||
        (vehicle.license_plate && v.license_plate && vehicle.license_plate === v.license_plate)
      )
    : null;

  // Fetch maintenance records for this vehicle
  const { data: allMaintenanceRecords = [] } = useQuery({
    queryKey: ['maintenance-records'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-performed_date'),
    enabled: open,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
    enabled: open,
  });

  const maintenanceRecords = vehicle 
    ? allMaintenanceRecords.filter(r => r.vehicle_id === vehicle.id)
    : [];

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
              <FileText className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="live">
              <Radio className="w-4 h-4 mr-2" />
              Live Data
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History ({maintenanceRecords.length})
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

          {/* Engine Info */}
          {(vehicle.engine_type && vehicle.engine_type !== 'unknown' || vehicle.engine_description) && (
            <div className="grid grid-cols-2 gap-4">
              {vehicle.engine_type && vehicle.engine_type !== 'unknown' && (
                <div className="space-y-1">
                  <Label className="text-slate-500 dark:text-slate-400">Engine Type</Label>
                  <p className="text-base font-medium text-slate-900 dark:text-white capitalize">{vehicle.engine_type}</p>
                </div>
              )}
              {vehicle.engine_description && (
                <div className="space-y-1 col-span-2">
                  <Label className="text-slate-500 dark:text-slate-400">Engine</Label>
                  <p className="text-base font-medium text-slate-900 dark:text-white">{vehicle.engine_description}</p>
                </div>
              )}
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

          <TabsContent value="live" className="space-y-4 mt-4">
            {motiveLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {motiveVehicle?.lat && motiveVehicle?.lon && (
                  <FleetMap
                    motiveVehicles={[motiveVehicle]}
                    selectedMotiveId={motiveVehicle.motive_id}
                    height="220px"
                  />
                )}
                <MotiveLivePanel motiveVehicle={motiveVehicle} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Button 
              onClick={() => {
                onOpenChange(false);
                navigate(`/MaintenanceRecordFormPage?vehicle=${vehicle.id}`);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Maintenance Record
            </Button>

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
                        <Label className="text-xs text-slate-500 dark:text-slate-400">Notes:</Label>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <History className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">No maintenance history yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add past service records to track this vehicle's maintenance history
                </p>
              </div>
            )}
            </TabsContent>
            </Tabs>
            </div>

            {/* Actions - Floating Bottom */}
            <div className="sticky bottom-0 flex gap-3 p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex-wrap sm:flex-nowrap">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
            </Button>
            <Button variant="outline" onClick={() => setShowPartsReport(true)} className="flex-1">
            Parts Report
            </Button>
            <Button onClick={() => { onOpenChange(false); onEdit && onEdit(vehicle); }} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            </div>
            <PartsNeededReport open={showPartsReport} onClose={() => setShowPartsReport(false)} preFilterVehicleId={vehicle?.id} />
            </DialogContent>
            </Dialog>
            );
            }