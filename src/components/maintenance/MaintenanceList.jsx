import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Wrench, Link2, ChevronsUpDown, Check } from 'lucide-react';
import { useServiceTypes } from '@/components/useServiceTypes';
import { cn } from '@/lib/utils';

export default function MaintenanceList({ records, vehicles, items, bills = [], intervals = [], onView, onEdit, onDelete, isDeleting }) {
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const serviceTypes = useServiceTypes(null, 'records');

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const getTypeLabel = (value) => {
    const found = serviceTypes.find(t => t.value === value);
    return found ? found.label : (value?.replace(/_/g, ' ') || '');
  };

  const maintenanceColors = {
    oil_change: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    filter_change: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    tire_rotation: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    inspection: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    repair: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    cleaning: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    other: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300',
  };
  const getTypeColor = (value) => maintenanceColors[value] || 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300';

  if (records.length === 0) {
    return (
      <Card className="border-2 border-dashed dark:border-slate-700">
        <CardContent className="p-12 text-center">
          <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No maintenance records yet</p>
        </CardContent>
      </Card>
    );
  }

  const selectedVehicle = vehicles.find(v => v.id === vehicleFilter);

  const filteredRecords = records
    .filter(r => vehicleFilter === 'all' || r.vehicle_id === vehicleFilter)
    .sort((a, b) => sortOrder === 'desc'
      ? new Date(b.performed_date) - new Date(a.performed_date)
      : new Date(a.performed_date) - new Date(b.performed_date)
    )
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const v = vehicleMap[r.vehicle_id];
      return (
        r.title?.toLowerCase().includes(q) ||
        r.vendor?.toLowerCase().includes(q) ||
        v?.name?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Searchable vehicle dropdown */}
        <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-56 justify-between font-normal">
              <span className="truncate">
                {selectedVehicle ? selectedVehicle.name : 'All Vehicles'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search vehicles..." />
              <CommandEmpty>No vehicles found.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="all" onSelect={() => { setVehicleFilter('all'); setVehicleOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', vehicleFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                  All Vehicles
                </CommandItem>
                {vehicles.map(v => (
                  <CommandItem key={v.id} value={`${v.name} ${v.year} ${v.make} ${v.model}`} onSelect={() => { setVehicleFilter(v.id); setVehicleOpen(false); }}>
                    <Check className={cn('mr-2 h-4 w-4', vehicleFilter === v.id ? 'opacity-100' : 'opacity-0')} />
                    {v.name} — {v.year} {v.make} {v.model}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest First</SelectItem>
            <SelectItem value="asc">Oldest First</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search records..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-52"
        />
      </div>

      {filteredRecords.length === 0 && (
        <Card className="border-2 border-dashed dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No records match the selected filter</p>
          </CardContent>
        </Card>
      )}

      {filteredRecords.map((record) => {
        const hasLinkedBill = !!record.linked_bill_id && bills.some(b => b.id === record.linked_bill_id);
        return (
          <Card
            key={record.id}
            className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onView(record)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{record.title}</h3>
                    <Badge className={getTypeColor(record.maintenance_type)}>
                      {getTypeLabel(record.maintenance_type)}
                    </Badge>
                    {hasLinkedBill && (
                      <Badge variant="outline" className="gap-1 text-purple-700 border-purple-300 bg-purple-50 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700">
                        <Link2 className="w-3 h-3" /> Linked Bill
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Vehicle</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {vehicleMap[record.vehicle_id]?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Date</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {format(new Date(record.performed_date + 'T12:00:00'), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {record.vendor && (
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Provider</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{record.vendor}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Cost</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ${record.total_cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  {record.odometer_reading && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                      Odometer: {record.odometer_reading} miles
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}