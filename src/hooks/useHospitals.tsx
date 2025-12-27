import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Hospital {
  id: string;
  organization_name: string;
  email: string;
  full_name: string | null;
  location_lat: number;
  location_lng: number;
}

// Default hospital locations with all details (using generated UUIDs)
const DEFAULT_HOSPITALS: Hospital[] = [
  { id: '00000000-0000-0000-0000-000000000001', organization_name: 'PGIMER Chandigarh', email: '', full_name: null, location_lat: 30.7649, location_lng: 76.7757 },
  { id: '00000000-0000-0000-0000-000000000002', organization_name: 'GMCH Sector 32', email: '', full_name: null, location_lat: 30.7422, location_lng: 76.7676 },
  { id: '00000000-0000-0000-0000-000000000003', organization_name: 'Fortis Hospital Mohali', email: '', full_name: null, location_lat: 30.7133, location_lng: 76.6912 },
  { id: '00000000-0000-0000-0000-000000000004', organization_name: 'Max Super Speciality', email: '', full_name: null, location_lat: 30.7046, location_lng: 76.7179 },
  { id: '00000000-0000-0000-0000-000000000005', organization_name: 'Ivy Hospital', email: '', full_name: null, location_lat: 30.7081, location_lng: 76.7104 },
  { id: '00000000-0000-0000-0000-000000000006', organization_name: 'Alchemist Hospital', email: '', full_name: null, location_lat: 30.7254, location_lng: 76.7408 },
  { id: '00000000-0000-0000-0000-000000000007', organization_name: 'Indus Hospital', email: '', full_name: null, location_lat: 30.7055, location_lng: 76.7245 },
  { id: '00000000-0000-0000-0000-000000000008', organization_name: 'Healing Hospital', email: '', full_name: null, location_lat: 30.7185, location_lng: 76.7325 },
  { id: '00000000-0000-0000-0000-000000000009', organization_name: 'SPS Apollo Hospital', email: '', full_name: null, location_lat: 30.6912, location_lng: 76.7489 },
  { id: '00000000-0000-0000-0000-000000000010', organization_name: 'Silver Oaks Hospital', email: '', full_name: null, location_lat: 30.7389, location_lng: 76.7812 },
  { id: '00000000-0000-0000-0000-000000000011', organization_name: 'Mukat Hospital', email: '', full_name: null, location_lat: 30.7512, location_lng: 76.7645 },
  { id: '00000000-0000-0000-0000-000000000012', organization_name: 'Grecian Hospital', email: '', full_name: null, location_lat: 30.7095, location_lng: 76.6878 },
];

// Hospital location lookup for DB hospitals
const HOSPITAL_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'PGIMER Chandigarh': { lat: 30.7649, lng: 76.7757 },
  'GMCH Sector 32': { lat: 30.7422, lng: 76.7676 },
  'Fortis Hospital Mohali': { lat: 30.7133, lng: 76.6912 },
  'Max Super Speciality': { lat: 30.7046, lng: 76.7179 },
  'Ivy Hospital': { lat: 30.7081, lng: 76.7104 },
  'Alchemist Hospital': { lat: 30.7254, lng: 76.7408 },
  'Indus Hospital': { lat: 30.7055, lng: 76.7245 },
  'Healing Hospital': { lat: 30.7185, lng: 76.7325 },
  'SPS Apollo Hospital': { lat: 30.6912, lng: 76.7489 },
  'Silver Oaks Hospital': { lat: 30.7389, lng: 76.7812 },
  'Mukat Hospital': { lat: 30.7512, lng: 76.7645 },
  'Grecian Hospital': { lat: 30.7095, lng: 76.6878 },
};

export function useHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>(DEFAULT_HOSPITALS);
  const [loading, setLoading] = useState(true);

  const fetchHospitals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, organization_name, email, full_name')
        .eq('role', 'hospital');

      if (error) throw error;

      // Combine DB hospitals with default hospitals
      const dbHospitals = (data || [])
        .filter(h => h.organization_name) // Only include hospitals with names
        .map(hospital => {
          const location = HOSPITAL_LOCATIONS[hospital.organization_name || ''] || 
                          { lat: 30.7333 + Math.random() * 0.03, lng: 76.7794 + Math.random() * 0.03 };
          return {
            ...hospital,
            organization_name: hospital.organization_name!,
            location_lat: location.lat,
            location_lng: location.lng
          };
        });

      // Merge: DB hospitals first, then default hospitals not in DB
      const dbHospitalNames = new Set(dbHospitals.map(h => h.organization_name));
      const uniqueDefaultHospitals = DEFAULT_HOSPITALS.filter(h => !dbHospitalNames.has(h.organization_name));
      
      setHospitals([...dbHospitals, ...uniqueDefaultHospitals]);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      // On error, use default hospitals
      setHospitals(DEFAULT_HOSPITALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Calculate distance between two points
  const calculateDistanceToHospital = (
    fromLat: number,
    fromLng: number,
    hospital: Hospital
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (hospital.location_lat - fromLat) * (Math.PI / 180);
    const dLng = (hospital.location_lng - fromLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(fromLat * (Math.PI / 180)) *
        Math.cos(hospital.location_lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get hospitals sorted by distance
  const getHospitalsByDistance = (fromLat: number, fromLng: number) => {
    return [...hospitals]
      .map(h => ({
        ...h,
        distance: calculateDistanceToHospital(fromLat, fromLng, h)
      }))
      .sort((a, b) => a.distance - b.distance);
  };

  return {
    hospitals,
    loading,
    fetchHospitals,
    getHospitalsByDistance
  };
}
