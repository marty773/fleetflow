import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Truck, FileText, Wrench, Package, Users, Calendar, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { useCompany } from '@/components/CompanyContext';

export default function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

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
    if (!searchTriggered || !searchTerm || searchTerm.length < 2) return null;

    const term = searchTerm.toLowerCase();
    const results = {
      vehicles: [],
      bills: [],
      maintenance: [],
      items: [],
      vendors: [],
      intervals: [],
    };

    results.vehicles = vehicles.filter(v => 
      v.company_id === selectedCompany &&
      (v.name?.toLowerCase().includes(term) ||
      v.license_plate?.toLowerCase().includes(term) ||
      v.vin?.toLowerCase().includes(term) ||
      v.make?.toLowerCase().includes(term) ||
      v.model?.toLowerCase().includes(term) ||
      v.type?.toLowerCase().includes(term) ||
      v.year?.toString().includes(term))
    );

    results.bills = bills.filter(b =>
      b.company_id === selectedCompany &&
      (b.vendor?.toLowerCase().includes(term) ||
      b.bill_number?.toLowerCase().includes(term) ||
      b.category?.toLowerCase().includes(term) ||
      b.notes?.toLowerCase().includes(term) ||
      b.line_items?.some(item => 
        item.description?.toLowerCase().includes(term)
      ))
    );

    results.maintenance = maintenanceRecords.filter(m =>
      m.company_id === selectedCompany &&
      (m.title?.toLowerCase().includes(term) ||
      m.vendor?.toLowerCase().includes(term) ||
      m.maintenance_type?.toLowerCase().includes(term) ||
      m.notes?.toLowerCase().includes(term) ||
      m.odometer_reading?.toLowerCase().includes(term))
    );

    results.items = items.filter(i =>
      i.company_id === selectedCompany &&
      (i.name?.toLowerCase().includes(term) ||
      i.vendor?.toLowerCase().includes(term) ||
      i.item_number?.toLowerCase().includes(term) ||
      i.description?.toLowerCase().includes(term))
    );

    results.vendors = vendors.filter(v =>
      v.company_id === selectedCompany &&
      (v.name?.toLowerCase().includes(term) ||
      v.contact_person?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term) ||
      v.phone?.toLowerCase().includes(term) ||
      v.category?.toLowerCase().includes(term) ||
      v.city?.toLowerCase().includes(term) ||
      v.state?.toLowerCase().includes(term))
    );

    results.intervals = intervals.filter(i =>
      i.company_id === selectedCompany &&
      (i.interval_name?.toLowerCase().includes(term) ||
      i.maintenance_type?.toLowerCase().includes(term) ||
      i.notes?.toLowerCase().includes(term))
    );

    return results;
  };

  const results = searchResults();
  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  const handleSearch = () => {
    if (searchTerm.length >= 2) {
      setSearchTriggered(true);
      setShowResults(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleResultClick = (type, item) => {
    setViewingItem({ type, item });
  };

  const handleEdit = () => {
    if (!viewingItem) return;
    
    const { type, item } = viewingItem;
    setViewingItem(null);
    setShowResults(false);
    setSearchTerm('');
    setSearchTriggered(false);
    setDialogOpen(false);

    switch(type) {
      case 'vehicles':
        navigate(createPageUrl('Vehicles') + `?edit=${item.id}`);
        break;
      case 'bills':
        navigate(createPageUrl('Bills') + `?edit=${item.id}`);
        break;
      case 'maintenance':
        navigate(createPageUrl('Maintenance') + `?edit=${item.id}`);
        break;
      case 'items':
        navigate(createPageUrl('Items') + `?edit=${item.id}`);
        break;
      case 'vendors':
        navigate(createPageUrl('Vendors') + `?edit=${item.id}`);
        break;
      case 'intervals':
        navigate(createPageUrl('Maintenance') + `?editInterval=${item.id}`);
        break;
      default:
        break;
    }
  };

  const handleCloseView = () => {
    setViewingItem(null);
  };

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  return (
    <>
      {/* Floating Search Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button 
            className="fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center rounded-full text-white shadow-2xl transition-all hover:scale-110"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Search className="w-6 h-6" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl p-0 max-h-[85vh]">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search vehicles, bills, maintenance, items, vendors..."
                className="pl-10 pr-20 py-6 text-base border-2 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ borderColor: 'var(--color-primary)' }}
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSearchTriggered(false);
                    setShowResults(false);
                  }}
                  className="absolute right-16 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 text-white rounded-lg font-medium transition-colors text-sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Search
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-100px)]">
            {showResults && totalResults > 0 && (
              <div className="p-4 space-y-6">
                {results && results.vehicles.length > 0 && (
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

                {results && results.bills.length > 0 && (
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

                {results && results.maintenance.length > 0 && (
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

                {results && results.items.length > 0 && (
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

                {results && results.vendors.length > 0 && (
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

                {results && results.intervals.length > 0 && (
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
            )}

            {showResults && totalResults === 0 && searchTerm.length >= 2 && (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No results found for "{searchTerm}"</p>
              </div>
            )}

            {!showResults && (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Search across all your fleet data</p>
                <p className="text-sm mt-1">Vehicles • Bills • Maintenance • Items • Vendors</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Item Dialog */}
      {viewingItem && (
        <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewingItem.type === 'vehicles' && 'Vehicle Details'}
                {viewingItem.type === 'bills' && 'Bill Details'}
                {viewingItem.type === 'maintenance' && 'Maintenance Details'}
                {viewingItem.type === 'items' && 'Item Details'}
                {viewingItem.type === 'vendors' && 'Vendor Details'}
                {viewingItem.type === 'intervals' && 'Interval Details'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {viewingItem.type === 'vehicles' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium">{viewingItem.item.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">License Plate</p>
                    <p className="font-medium">{viewingItem.item.license_plate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Make/Model</p>
                    <p className="font-medium">{viewingItem.item.make} {viewingItem.item.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Year</p>
                    <p className="font-medium">{viewingItem.item.year}</p>
                  </div>
                  {viewingItem.item.vin && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500">VIN</p>
                      <p className="font-medium">{viewingItem.item.vin}</p>
                    </div>
                  )}
                </div>
              )}

              {viewingItem.type === 'bills' && (
                <>
                  {viewingItem.item.photo_url && (
                    <img src={viewingItem.item.photo_url} alt="Bill" className="w-full rounded-lg" />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Vendor</p>
                      <p className="font-medium">{viewingItem.item.vendor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Date</p>
                      <p className="font-medium">{format(new Date(viewingItem.item.bill_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Bill Number</p>
                      <p className="font-medium">{viewingItem.item.bill_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total</p>
                      <p className="font-medium text-lg">${viewingItem.item.total_amount?.toFixed(2)}</p>
                    </div>
                  </div>
                </>
              )}

              {viewingItem.type === 'maintenance' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Title</p>
                    <p className="font-medium">{viewingItem.item.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Vehicle</p>
                    <p className="font-medium">{vehicleMap[viewingItem.item.vehicle_id]?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Date</p>
                    <p className="font-medium">{format(new Date(viewingItem.item.performed_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Vendor</p>
                    <p className="font-medium">{viewingItem.item.vendor || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Cost</p>
                    <p className="font-medium text-lg">${viewingItem.item.total_cost?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              )}

              {viewingItem.type === 'items' && (
                <>
                  {viewingItem.item.photo_url && (
                    <img src={viewingItem.item.photo_url} alt="Item" className="w-full h-48 object-cover rounded-lg" />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Name</p>
                      <p className="font-medium">{viewingItem.item.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Item Number</p>
                      <p className="font-medium">{viewingItem.item.item_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Vendor</p>
                      <p className="font-medium">{viewingItem.item.vendor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Price</p>
                      <p className="font-medium">${viewingItem.item.price?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Quantity on Hand</p>
                      <p className="font-medium text-lg">{viewingItem.item.quantity_on_hand}</p>
                    </div>
                  </div>
                  {viewingItem.item.description && (
                    <div>
                      <p className="text-sm text-slate-500">Description</p>
                      <p className="text-sm mt-1">{viewingItem.item.description}</p>
                    </div>
                  )}
                </>
              )}

              {viewingItem.type === 'vendors' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium">{viewingItem.item.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Category</p>
                    <p className="font-medium capitalize">{viewingItem.item.category}</p>
                  </div>
                  {viewingItem.item.contact_person && (
                    <div>
                      <p className="text-sm text-slate-500">Contact Person</p>
                      <p className="font-medium">{viewingItem.item.contact_person}</p>
                    </div>
                  )}
                  {viewingItem.item.email && (
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium">{viewingItem.item.email}</p>
                    </div>
                  )}
                  {viewingItem.item.phone && (
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium">{viewingItem.item.phone}</p>
                    </div>
                  )}
                </div>
              )}

              {viewingItem.type === 'intervals' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium">{viewingItem.item.interval_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Vehicle</p>
                    <p className="font-medium">{vehicleMap[viewingItem.item.vehicle_id]?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Type</p>
                    <p className="font-medium capitalize">{viewingItem.item.maintenance_type?.replace('_', ' ')}</p>
                  </div>
                  {viewingItem.item.interval_months && (
                    <div>
                      <p className="text-sm text-slate-500">Interval</p>
                      <p className="font-medium">Every {viewingItem.item.interval_months} months</p>
                    </div>
                  )}
                  {viewingItem.item.interval_miles && (
                    <div>
                      <p className="text-sm text-slate-500">Interval</p>
                      <p className="font-medium">Every {viewingItem.item.interval_miles} miles</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={handleCloseView}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
              >
                Edit
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}