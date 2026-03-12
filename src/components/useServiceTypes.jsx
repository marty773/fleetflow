import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export const BUILT_IN_TYPES = [
  { value: 'oil_change', label: 'Oil Change', applies_to: 'records' },
  { value: 'filter_change', label: 'Filter Change', applies_to: 'records' },
  { value: 'tire_rotation', label: 'Tire Rotation', applies_to: 'records' },
  { value: 'inspection', label: 'Inspection', applies_to: 'both' },
  { value: 'repair', label: 'Repair', applies_to: 'both' },
  { value: 'cleaning', label: 'Cleaning', applies_to: 'records' },
  { value: 'fuel', label: 'Fuel', applies_to: 'bills' },
  { value: 'maintenance', label: 'Maintenance', applies_to: 'bills' },
  { value: 'repairs', label: 'Repairs', applies_to: 'bills' },
  { value: 'insurance', label: 'Insurance', applies_to: 'bills' },
  { value: 'registration', label: 'Registration', applies_to: 'bills' },
  { value: 'tolls', label: 'Tolls', applies_to: 'bills' },
  { value: 'other', label: 'Other', applies_to: 'both' },
];

/**
 * Returns merged built-in + custom service types for a company and scope.
 * @param {string} companyId
 * @param {'bills'|'records'|'both'} scope
 */
export function useServiceTypes(companyId, scope = 'both') {
  const [customTypes, setCustomTypes] = useState([]);

  useEffect(() => {
    if (!companyId) return;
    base44.entities.ServiceType.filter({ company_id: companyId }).then(setCustomTypes);
  }, [companyId]);

  const filter = (t) => scope === 'both' || t.applies_to === scope || t.applies_to === 'both';

  return [...BUILT_IN_TYPES.filter(filter), ...customTypes.filter(filter)];
}