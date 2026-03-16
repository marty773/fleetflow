import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Returns a map of { [vehicle_id]: currentOdometer }
 * matched from Motive live data via VIN or license plate.
 */
export function useVehicleOdometers(vehicles = []) {
  const { data } = useQuery({
    queryKey: ['motive-vehicle-data'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('fetchMotiveVehicleData', {});
        return res.data;
      } catch {
        return { vehicles: [] };
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const motiveVehicles = data?.vehicles || [];

  // Build map: vehicle_id -> current odometer
  const odometers = {};
  for (const localV of vehicles) {
    const match = motiveVehicles.find(mv =>
      (localV.vin && mv.vin && localV.vin === mv.vin) ||
      (localV.license_plate && mv.license_plate && localV.license_plate === mv.license_plate)
    );
    if (match?.odometer != null) {
      odometers[localV.id] = Math.round(match.odometer);
    }
  }

  return odometers;
}