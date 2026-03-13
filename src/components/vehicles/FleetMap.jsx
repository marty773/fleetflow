import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function PanTo({ vehicle }) {
  const map = useMap();
  useEffect(() => {
    if (vehicle?.lat && vehicle?.lon) {
      map.flyTo([vehicle.lat, vehicle.lon], 14, { duration: 0.8 });
    }
  }, [vehicle?.motive_id]);
  return null;
}

// Fix leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createTruckIcon(isSelected = false) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${isSelected ? '#f59e0b' : '#1e293b'};
      border: 2px solid white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function FitBounds({ vehicles }) {
  const map = useMap();
  useEffect(() => {
    const points = vehicles.filter(v => v.lat && v.lon).map(v => [v.lat, v.lon]);
    if (points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 13);
      } else {
        map.fitBounds(points, { padding: [40, 40] });
      }
    }
  }, [vehicles]);
  return null;
}

export default function FleetMap({ motiveVehicles = [], selectedMotiveId = null, onSelectVehicle, height = '400px' }) {
  const located = motiveVehicles.filter(v => v.lat && v.lon);
  const selectedVehicle = located.find(v => String(v.motive_id) === String(selectedMotiveId)) || null;

  if (located.length === 0) {
    return (
      <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400" style={{ height }}>
        <div className="text-center">
          <Navigation className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No location data available</p>
        </div>
      </div>
    );
  }

  const center = [located[0].lat, located[0].lon];

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds vehicles={located} />
        {selectedVehicle && <PanTo vehicle={selectedVehicle} />}
        {located.map((v) => (
          <Marker
            key={v.motive_id}
            position={[v.lat, v.lon]}
            icon={createTruckIcon(String(v.motive_id) === String(selectedMotiveId))}
            eventHandlers={{ click: () => onSelectVehicle && onSelectVehicle(v) }}
          >
            <Tooltip permanent={false} direction="top" offset={[0, -18]} opacity={1}>
              <div style={{ minWidth: '160px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{v.number || `Vehicle ${v.motive_id}`}</div>
                {v.current_driver && (
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    👤 {v.current_driver.first_name} {v.current_driver.last_name}
                  </div>
                )}
                {v.description && (
                  <div style={{ fontSize: '11px', color: '#475569' }}>📍 {v.description}</div>
                )}
                {v.speed != null && (
                  <div style={{ fontSize: '11px', color: '#475569' }}>🚀 {v.speed} mph</div>
                )}
                {v.odometer != null && (
                  <div style={{ fontSize: '11px', color: '#475569' }}>🔢 {Math.round(v.odometer).toLocaleString()} mi</div>
                )}
                {v.located_at && (
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(v.located_at).toLocaleString()}
                  </div>
                )}
              </div>
            </Tooltip>
            <Popup>
              <div className="text-sm font-medium">{v.number || `Vehicle ${v.motive_id}`}</div>
              {v.speed != null && <div className="text-xs text-slate-500">{v.speed} mph</div>}
              {v.current_driver && (
                <div className="text-xs text-slate-500">
                  Driver: {v.current_driver.first_name} {v.current_driver.last_name}
                </div>
              )}
              {v.located_at && (
                <div className="text-xs text-slate-400">
                  {new Date(v.located_at).toLocaleString()}
                </div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}