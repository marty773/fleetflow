import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Edit2, Truck, Package, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function VehicleViewDialog({ vehicle, open, onOpenChange, onEdit }) {
  if (!vehicle) return null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{vehicle.name}</DialogTitle>
              <p className="text-slate-600 mt-1">
                {vehicle.make} {vehicle.model} • {vehicle.year}
              </p>
            </div>
            <Badge variant="secondary" className="bg-slate-100">
              {vehicle.type === 'truck' ? (
                <Truck className="w-4 h-4 mr-1" />
              ) : (
                <Package className="w-4 h-4 mr-1" />
              )}
              {vehicle.type}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-slate-500">Make</Label>
              <p className="text-base font-medium">{vehicle.make}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-500">Model</Label>
              <p className="text-base font-medium">{vehicle.model}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-500">Year</Label>
              <p className="text-base font-medium">{vehicle.year}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-500">Status</Label>
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
            <Label className="text-slate-500">License Plate</Label>
            <div className="flex items-center gap-2">
              <p className="text-base font-mono font-semibold bg-slate-50 px-3 py-2 rounded border flex-1">
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
              <Label className="text-slate-500">VIN Number</Label>
              <div className="flex items-center gap-2">
                <p className="text-base font-mono bg-slate-50 px-3 py-2 rounded border flex-1">
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
                <Label className="text-slate-500">GVW</Label>
                <p className="text-base font-medium">{vehicle.gvw.toLocaleString()} lbs</p>
              </div>
            )}
            {vehicle.purchase_date && (
              <div className="space-y-1">
                <Label className="text-slate-500">Purchase Date</Label>
                <p className="text-base font-medium">
                  {format(new Date(vehicle.purchase_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Trailer Features */}
          {vehicle.type === 'trailer' && (
            <div className="space-y-2">
              <Label className="text-slate-500">Features</Label>
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
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t mt-6">
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