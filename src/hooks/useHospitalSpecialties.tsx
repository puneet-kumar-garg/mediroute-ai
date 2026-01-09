import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHospitals, Hospital } from '@/hooks/useHospitals';

interface HospitalUpdate {
  id: string;
  hospital_id: string;
  update_type: 'department' | 'equipment' | 'specialist' | 'capacity' | 'accreditation';
  update_data: any;
  created_at: string;
}

interface SpecialtyMatch {
  hospital: Hospital;
  specialties: string[];
  matchScore: number;
  distance: number;
  reason: string;
}

const SPECIALTY_KEYWORDS = {
  'Cardiac': ['cardiology', 'heart', 'cardiac', 'cath lab', 'cardiovascular'],
  'Oncology': ['cancer', 'oncology', 'chemotherapy', 'radiation', 'tumor'],
  'Neuro': ['neurology', 'stroke', 'brain', 'neurological', 'neuro'],
  'Trauma': ['trauma', 'emergency', 'accident', 'surgery', 'icu'],
  'Maternity': ['maternity', 'obstetrics', 'gynecology', 'neonatal', 'delivery'],
  'Orthopedics': ['orthopedic', 'bone', 'joint', 'fracture', 'spine'],
  'Pediatric': ['pediatric', 'children', 'nicu', 'child', 'infant'],
  'Respiratory': ['pulmonary', 'respiratory', 'lung', 'breathing', 'ventilator']
};

export function useHospitalSpecialties() {
  const { hospitals: hospitalData } = useHospitals();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [updates, setUpdates] = useState<HospitalUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  // Update hospitals when hospitalData changes
  useEffect(() => {
    setHospitals(hospitalData);
    setLoading(false);
  }, [hospitalData]);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Analyze hospital capabilities and assign specialties
  const analyzeSpecialties = useCallback((hospital: Hospital, recentUpdates: HospitalUpdate[]) => {
    const specialties: string[] = [];
    const reasons: string[] = [];

    // Analyze hospital name and address for keywords
    const hospitalText = `${hospital.organization_name} ${hospital.address || ''}`.toLowerCase();
    
    // Check each specialty
    Object.entries(SPECIALTY_KEYWORDS).forEach(([specialty, keywords]) => {
      let score = 0;
      const matchedKeywords: string[] = [];

      // Check hospital name/address
      keywords.forEach(keyword => {
        if (hospitalText.includes(keyword)) {
          score += 2;
          matchedKeywords.push(keyword);
        }
      });

      // Check recent updates
      recentUpdates.forEach(update => {
        const updateText = JSON.stringify(update.update_data).toLowerCase();
        keywords.forEach(keyword => {
          if (updateText.includes(keyword)) {
            score += 3;
            matchedKeywords.push(`${update.update_type}: ${keyword}`);
          }
        });
      });

      // Assign specialty if score is high enough
      if (score >= 2) {
        specialties.push(specialty);
        reasons.push(`${specialty}: ${matchedKeywords.join(', ')}`);
      }
    });

    return { specialties, reasons };
  }, []);

  // Update hospital specialties
  const updateHospitalSpecialties = useCallback(async (hospitalId: string, specialties: string[]) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          specialties,
          last_updated_specialties: new Date().toISOString()
        })
        .eq('id', hospitalId)
        .eq('role', 'hospital');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating hospital specialties:', error);
      return false;
    }
  }, []);

  // Add hospital update
  const addHospitalUpdate = useCallback(async (
    hospitalId: string,
    updateType: HospitalUpdate['update_type'],
    updateData: any
  ) => {
    try {
      const { error } = await supabase
        .from('hospital_updates')
        .insert({
          hospital_id: hospitalId,
          update_type: updateType,
          update_data: updateData
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding hospital update:', error);
      return false;
    }
  }, []);

  // Find best hospitals for emergency type
  const findBestHospitals = useCallback((
    patientLat: number,
    patientLng: number,
    emergencyKeyword: string
  ): { best: SpecialtyMatch | null; nearest: SpecialtyMatch | null } => {
    if (hospitals.length === 0) {
      return { best: null, nearest: null };
    }

    const matches: SpecialtyMatch[] = hospitals.map(hospital => {
      const distance = calculateDistance(patientLat, patientLng, hospital.location_lat, hospital.location_lng);
      
      // Assign default specialties based on hospital name if none exist
      let specialties = hospital.specialties || [];
      if (specialties.length === 0) {
        const hospitalName = hospital.organization_name.toLowerCase();
        if (hospitalName.includes('pgimer') || hospitalName.includes('aiims')) {
          specialties = ['Cardiac', 'Neuro', 'Trauma', 'Oncology', 'Pediatric'];
        } else if (hospitalName.includes('fortis') || hospitalName.includes('max') || hospitalName.includes('apollo')) {
          specialties = ['Cardiac', 'Trauma', 'Orthopedics', 'Maternity'];
        } else if (hospitalName.includes('gmch') || hospitalName.includes('sms')) {
          specialties = ['Trauma', 'Maternity', 'Pediatric'];
        } else {
          specialties = ['Trauma', 'Cardiac'];
        }
      }
      
      // Calculate match score
      let matchScore = 0;
      let reason = '';

      if (specialties.includes(emergencyKeyword)) {
        matchScore = 100; // Perfect match
        reason = `Specialized in ${emergencyKeyword}`;
      } else {
        // Check for related specialties
        const relatedKeywords = SPECIALTY_KEYWORDS[emergencyKeyword as keyof typeof SPECIALTY_KEYWORDS] || [];
        const hospitalText = `${hospital.organization_name} ${hospital.address || ''}`.toLowerCase();
        
        relatedKeywords.forEach(keyword => {
          if (hospitalText.includes(keyword)) {
            matchScore += 20;
            reason = `Has ${keyword} capabilities`;
          }
        });

        // General emergency capability
        if (specialties.includes('Trauma') && emergencyKeyword !== 'Trauma') {
          matchScore += 10;
          reason = reason || 'General emergency capabilities';
        }
      }

      // Distance bonus (closer = higher score)
      const distanceScore = Math.max(0, 50 - (distance / 1000));
      matchScore += distanceScore;

      return {
        hospital,
        specialties,
        matchScore,
        distance,
        reason: reason || 'General hospital'
      };
    });

    // Sort by match score (highest first)
    const sortedByMatch = [...matches].sort((a, b) => b.matchScore - a.matchScore);
    
    // Sort by distance (closest first)
    const sortedByDistance = [...matches].sort((a, b) => a.distance - b.distance);

    return {
      best: sortedByMatch[0] || null,
      nearest: sortedByDistance[0] || null
    };
  }, [hospitals]);

  // Fetch hospitals and updates
  const fetchData = useCallback(async () => {
    try {
      // Fetch recent updates (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: updateData, error: updateError } = await supabase
        .from('hospital_updates')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (updateError) {
        console.warn('Error fetching hospital updates:', updateError);
        setUpdates([]);
      } else {
        setUpdates(updateData as HospitalUpdate[]);
      }

      // Auto-update specialties for hospitals that need it
      for (const hospital of hospitals) {
        const hospitalUpdates = (updateData as HospitalUpdate[] || []).filter(u => u.hospital_id === hospital.id);
        const { specialties } = analyzeSpecialties(hospital, hospitalUpdates);
        
        // Update if specialties have changed
        const currentSpecialties = hospital.specialties || [];
        if (JSON.stringify(specialties.sort()) !== JSON.stringify(currentSpecialties.sort())) {
          await updateHospitalSpecialties(hospital.id, specialties);
        }
      }

    } catch (error) {
      console.error('Error fetching hospital data:', error);
      setUpdates([]);
    }
  }, [hospitals, analyzeSpecialties, updateHospitalSpecialties]);

  useEffect(() => {
    if (hospitals.length > 0) {
      fetchData();
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel('hospital-specialties')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hospital_updates'
      }, () => {
        fetchData();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.hospital'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, hospitals.length]);

  return {
    hospitals,
    updates,
    loading,
    addHospitalUpdate,
    updateHospitalSpecialties,
    findBestHospitals,
    analyzeSpecialties
  };
}