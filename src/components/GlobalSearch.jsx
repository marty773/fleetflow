import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Truck, FileText, Wrench, Package, Users, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: intervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const searchResults = () => {
    if (!searchTerm || searchTerm.length < 2) return null;

    const term = searchTerm.toLowerCase();
    const results = {
      vehicles: [],
      bills: [],
      maintenance: [],
      items: [],
      vendors: [],
      intervals: [],
    };

    // Search vehicles
    results.vehicles = vehicles.filter(v => 
      v.name?.toLowerCase().includes(term) ||
      v.license_plate?.toLowerCase().includes(term) ||
      v.vin?.toLowerCase().includes(term) ||
      v.make?.toLowerCase().includes(term) ||
      v.model?.toLowerCase().includes(term)
    );

    // Search bills
    results.bills = bills.filter(b =>
      b.vendor?.toLowerCase().includes(term) ||
      b.bill_number?.toLowerCase().includes(term) ||
      b.category?.toLowerCase().includes(term)
    );

    // Search maintenance records
    results.maintenance = maintenanceRecords.filter(m =>
      m.title?.toLowerCase().includes(term) ||
      m.vendor?.toLowerCase().includes(term) ||
      m.maintenance_type?.toLowerCase().includes(term)
    );

    // Search items
    results.items = items.filter(i =>
      i.name?.toLowerCase().includes(term) ||
      i.vendor?.toLowerCase().includes(term) ||
      i.item_number?.toLowerCase().includes(term) ||
      i.description?.toLowerCase().includes(term)
    );

    // Search vendors
    results.vendors = vendors.filter(v =>
      v.name?.toLowerCase().includes(term) ||
      v.contact_person?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term) ||
      v.category?.toLowerCase().includes(term)
    );

    // Search intervals
    results.intervals = intervals.filter(i =>
      i.interval_name?.toLowerCase().includes(term) ||
      i.maintenance_type?.toLowerCase().includes(term)
    );

    return results;
  };

  const results = searchResults();
  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  const handleResultClick = (type, item) => {
    setShowResults(false);
    setSearchTerm('');

    switch(type) {
      case 'vehicles':
        navigate(createPageUrl('Vehicles'));
        break;
      case 'bills':
        navigate(createPageUrl('Bills') + `?view=${item.id}`);
        break;
      case 'maintenance':
        navigate(createPageUrl('Maintenance'));
        break;
      case 'items':
        navigate(createPageUrl('Items'));
        break;
      case 'vendors':
        navigate(createPageUrl('Vendors'));
        break;
      case 'intervals':
        navigate(createPageUrl('Maintenance'));
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (searchTerm.length >= 2) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [searchTerm]);

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-xl px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vehicles, bills, maintenance, items, vendors..."
            className="pl-12 pr-4 py-6 text-base bg-white shadow-2xl border-2 border-slate-200 rounded-2xl focus:border-amber-500"
          />
        </div>
      </div>

      <Dialog open={showResults && totalResults > 0} onOpenChange={setShowResults}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Results ({totalResults})</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {results.vehicles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Vehicles ({results.vehicles.length})
                </h3>
                <div className="space-y-2">
                  {results.vehicles.map(vehicle => (
                    <button
                      key={vehicle.id}
                      onClick={() => handleResultClick('vehicles', vehicle)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <p className="font-medium">{vehicle.name}</p>
                      <p className="text-sm text-slate-600">
                        {vehicle.make} {vehicle.model} {vehicle.year} • {vehicle.license_plate}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.bills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Bills ({results.bills.length})
                </h3>
                <div className="space-y-2">
                  {results.bills.map(bill => (
                    <button
                      key={bill.id}
                      onClick={() => handleResultClick('bills', bill)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{bill.vendor}</p>
                          <p className="text-sm text-slate-600">
                            {bill.bill_number && `#${bill.bill_number} • `}
                            {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <p className="font-semibold">${bill.total_amount?.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.maintenance.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Maintenance Records ({results.maintenance.length})
                </h3>
                <div className="space-y-2">
                  {results.maintenance.map(record => (
                    <button
                      key={record.id}
                      onClick={() => handleResultClick('maintenance', record)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <p className="font-medium">{record.title}</p>
                      <p className="text-sm text-slate-600">
                        {vehicleMap[record.vehicle_id]?.name} • {format(new Date(record.performed_date), 'MMM dd, yyyy')}
                        {record.vendor && ` • ${record.vendor}`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.items.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Items ({results.items.length})
                </h3>
                <div className="space-y-2">
                  {results.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick('items', item)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-slate-600">
                            {item.item_number && `${item.item_number} • `}
                            {item.vendor}
                          </p>
                        </div>
                        <Badge variant="outline">{item.quantity_on_hand} in stock</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.vendors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Vendors ({results.vendors.length})
                </h3>
                <div className="space-y-2">
                  {results.vendors.map(vendor => (
                    <button
                      key={vendor.id}
                      onClick={() => handleResultClick('vendors', vendor)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-sm text-slate-600">
                        {vendor.category && <Badge variant="outline" className="mr-2 capitalize">{vendor.category}</Badge>}
                        {vendor.contact_person && vendor.contact_person}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.intervals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduled Intervals ({results.intervals.length})
                </h3>
                <div className="space-y-2">
                  {results.intervals.map(interval => (
                    <button
                      key={interval.id}
                      onClick={() => handleResultClick('intervals', interval)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <p className="font-medium">{interval.interval_name}</p>
                      <p className="text-sm text-slate-600">
                        {vehicleMap[interval.vehicle_id]?.name}
                        {interval.interval_months && ` • Every ${interval.interval_months} months`}
                        {interval.interval_miles && ` • Every ${interval.interval_miles} miles`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}