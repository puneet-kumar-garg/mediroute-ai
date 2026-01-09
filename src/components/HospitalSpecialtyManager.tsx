import { useState } from 'react';
import { useHospitalSpecialties } from '@/hooks/useHospitalSpecialties';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Plus, Stethoscope, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function HospitalSpecialtyManager() {
  const { user, profile } = useAuth();
  const { hospitals, addHospitalUpdate, loading } = useHospitalSpecialties();
  const [updateType, setUpdateType] = useState<'department' | 'equipment' | 'specialist' | 'capacity' | 'accreditation'>('department');
  const [updateData, setUpdateData] = useState('');

  const currentHospital = hospitals.find(h => h.id === user?.id);

  const handleAddUpdate = async () => {
    if (!user || !updateData.trim()) return;

    let parsedData;
    try {
      parsedData = JSON.parse(updateData);
    } catch {
      // If not JSON, treat as simple text
      parsedData = { description: updateData };
    }

    const success = await addHospitalUpdate(user.id, updateType, parsedData);
    if (success) {
      toast.success('Hospital update added successfully');
      setUpdateData('');
    } else {
      toast.error('Failed to add update');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Hospital Specialty Management</h2>
      </div>

      {/* Current Hospital Info */}
      {currentHospital && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              {currentHospital.organization_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Current Specialties</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentHospital.specialties?.length ? (
                    currentHospital.specialties.map(specialty => (
                      <Badge key={specialty} variant="secondary">{specialty}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No specialties assigned</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="text-sm">{currentHospital.address || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Hospital Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Update Type</label>
            <Select value={updateType} onValueChange={(value: any) => setUpdateType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">New Department</SelectItem>
                <SelectItem value="equipment">Equipment Upgrade</SelectItem>
                <SelectItem value="specialist">Specialist Addition</SelectItem>
                <SelectItem value="capacity">Capacity Update</SelectItem>
                <SelectItem value="accreditation">Accreditation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Update Details</label>
            <Textarea
              placeholder={`Example for ${updateType}:\n${
                updateType === 'department' ? '{"name": "Cardiology Department", "services": ["cardiac surgery", "cath lab"]}' :
                updateType === 'equipment' ? '{"equipment": "MRI Scanner", "department": "Radiology"}' :
                updateType === 'specialist' ? '{"name": "Dr. Smith", "specialty": "Neurology"}' :
                updateType === 'capacity' ? '{"icu_beds": 20, "general_beds": 100}' :
                '{"type": "JCI Accreditation", "date": "2024-01-01"}'
              }`}
              value={updateData}
              onChange={(e) => setUpdateData(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter JSON format or simple text description
            </p>
          </div>

          <Button onClick={handleAddUpdate} disabled={!updateData.trim()}>
            <Activity className="w-4 h-4 mr-2" />
            Add Update
          </Button>
        </CardContent>
      </Card>

      {/* Specialty Keywords Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Specialty Keywords Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Cardiac</p>
              <p className="text-muted-foreground">cardiology, heart, cardiac, cath lab</p>
            </div>
            <div>
              <p className="font-medium">Trauma</p>
              <p className="text-muted-foreground">trauma, emergency, accident, surgery</p>
            </div>
            <div>
              <p className="font-medium">Neuro</p>
              <p className="text-muted-foreground">neurology, stroke, brain, neurological</p>
            </div>
            <div>
              <p className="font-medium">Maternity</p>
              <p className="text-muted-foreground">maternity, obstetrics, neonatal</p>
            </div>
            <div>
              <p className="font-medium">Oncology</p>
              <p className="text-muted-foreground">cancer, oncology, chemotherapy</p>
            </div>
            <div>
              <p className="font-medium">Pediatric</p>
              <p className="text-muted-foreground">pediatric, children, nicu</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}