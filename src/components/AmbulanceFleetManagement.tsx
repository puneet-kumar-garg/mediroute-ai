import { useState, useEffect, useMemo } from 'react';
import { useAmbulanceRealtime } from '@/hooks/useAmbulanceRealtime';
import { useEmergencyTokens } from '@/hooks/useEmergencyTokens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  MapPin, 
  Navigation, 
  Clock, 
  Battery, 
  User, 
  Truck, 
  X,
  Unlock,
  Route,
  Building2
} from 'lucide-react';
import Map from '@/components/Map';
import { toast } from 'sonner';

type AmbulanceStatus = 'Available' | 'Dispatched' | 'En Route To Patient' | 'Patient Onboard';

interface AmbulanceWithStatus {
  id: string;
  vehicle_number: string;
  driver_name: string | null;
  care_type: string | null;
  battery_percentage: number | null;
  current_lat: number | null;
  current_lng: number | null;
  speed: number | null;
  heading: number | null;
  destination_name: string | null;
  last_updated: string;
  emergency_status: string;
  status: AmbulanceStatus;
}

export default function AmbulanceFleetManagement() {
  const { ambulances, loading } = useAmbulanceRealtime();
  const { pendingTokens, assignedTokens, activeTokens, releaseAmbulance } = useEmergencyTokens();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AmbulanceStatus | 'All'>('All');
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null);

  // Map ambulance data to include computed status
  const ambulancesWithStatus: AmbulanceWithStatus[] = useMemo(() => {
    const tokenBusyAmbulanceIds = new Set(
      [...pendingTokens, ...assignedTokens, ...activeTokens]
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .map(t => t.ambulance_id)
    );

    return ambulances.map(amb => {
      let status: AmbulanceStatus = 'Available';
      
      if (tokenBusyAmbulanceIds.has(amb.id)) {
        const token = [...pendingTokens, ...assignedTokens, ...activeTokens]
          .find(t => t.ambulance_id === amb.id);
        
        if (token) {
          switch (token.status) {
            case 'pending':
            case 'assigned':
              status = 'Dispatched';
              break;
            case 'in_progress':
              status = 'En Route To Patient';
              break;
            case 'at_patient':
            case 'to_hospital':
              status = 'Patient Onboard';
              break;
            default:
              status = 'Available';
          }
        }
      } else if (amb.emergency_status === 'active' || amb.emergency_status === 'responding') {
        status = 'Dispatched';
      }

      return {
        ...amb,
        status
      };
    });
  }, [ambulances, pendingTokens, assignedTokens, activeTokens]);

  // Filter ambulances based on search and status
  const filteredAmbulances = useMemo(() => {
    return ambulancesWithStatus.filter(amb => {
      const matchesSearch = searchQuery === '' || 
        amb.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (amb.driver_name && amb.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || amb.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [ambulancesWithStatus, searchQuery, statusFilter]);

  const selectedAmbulance = ambulancesWithStatus.find(a => a.id === selectedAmbulanceId);

  const getStatusColor = (status: AmbulanceStatus) => {
    switch (status) {
      case 'Available': return 'border-green-500 shadow-green-500/20';
      case 'Dispatched': return 'border-blue-500 shadow-blue-500/20';
      case 'En Route To Patient': return 'border-yellow-500 shadow-yellow-500/20';
      case 'Patient Onboard': return 'border-orange-500 shadow-orange-500/20';
      default: return 'border-gray-500 shadow-gray-500/20';
    }
  };

  const getStatusBadgeColor = (status: AmbulanceStatus) => {
    switch (status) {
      case 'Available': return 'bg-green-500 text-white';
      case 'Dispatched': return 'bg-blue-500 text-white';
      case 'En Route To Patient': return 'bg-yellow-500 text-black';
      case 'Patient Onboard': return 'bg-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleReleaseAmbulance = async (ambulanceId: string, vehicleNumber: string) => {
    const success = await releaseAmbulance(ambulanceId);
    if (success) {
      toast.success(`${vehicleNumber} Released`, {
        description: 'Ambulance is now available for new emergencies.'
      });
    } else {
      toast.error('Failed to release ambulance');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-950 min-h-screen p-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Ambulance Fleet</h1>
        <p className="text-slate-400">Manage and monitor all ambulances in the system</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search by vehicle number or driver name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400 w-4 h-4" />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AmbulanceStatus | 'All')}>
            <SelectTrigger className="w-48 bg-slate-900 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Dispatched">Dispatched</SelectItem>
              <SelectItem value="En Route To Patient">En Route To Patient</SelectItem>
              <SelectItem value="Patient Onboard">Patient Onboard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Available</p>
                <p className="text-white text-2xl font-bold">
                  {ambulancesWithStatus.filter(a => a.status === 'Available').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Dispatched</p>
                <p className="text-white text-2xl font-bold">
                  {ambulancesWithStatus.filter(a => a.status === 'Dispatched').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">En Route</p>
                <p className="text-white text-2xl font-bold">
                  {ambulancesWithStatus.filter(a => a.status === 'En Route To Patient').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Patient Onboard</p>
                <p className="text-white text-2xl font-bold">
                  {ambulancesWithStatus.filter(a => a.status === 'Patient Onboard').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedAmbulance ? (
        /* Detailed Panel */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Ambulance Details</h2>
            <Button 
              variant="outline" 
              onClick={() => setSelectedAmbulanceId(null)}
              className="border-slate-700 text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Live Map */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Live Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] rounded-b-xl overflow-hidden">
                  <Map
                    center={[
                      selectedAmbulance.current_lat || 30.7333,
                      selectedAmbulance.current_lng || 76.7794
                    ]}
                    zoom={15}
                    followCenter={true}
                    markers={[{
                      position: [
                        selectedAmbulance.current_lat || 30.7333,
                        selectedAmbulance.current_lng || 76.7794
                      ] as [number, number],
                      popup: `${selectedAmbulance.vehicle_number} - ${selectedAmbulance.status}`,
                      icon: 'ambulance' as const,
                      highlighted: true
                    }]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="space-y-6">
              {/* Vehicle Info */}
              <Card className={`bg-slate-900 border-2 shadow-lg ${getStatusColor(selectedAmbulance.status)}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-xl">{selectedAmbulance.vehicle_number}</CardTitle>
                    <Badge className={`${getStatusBadgeColor(selectedAmbulance.status)} px-3 py-1`}>
                      {selectedAmbulance.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-slate-400 text-sm">Driver</p>
                        <p className="text-white font-medium">{selectedAmbulance.driver_name || 'Not assigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-slate-400 text-sm">Care Type</p>
                        <p className="text-white font-medium">{selectedAmbulance.care_type || 'Standard'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Battery className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-slate-400 text-sm">Battery</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (selectedAmbulance.battery_percentage || 0) > 50 ? 'bg-green-500' :
                              (selectedAmbulance.battery_percentage || 0) > 20 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${selectedAmbulance.battery_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-white font-medium">{selectedAmbulance.battery_percentage || 0}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Data */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Live Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                      <Navigation className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-slate-400 text-sm">Speed</p>
                        <p className="text-white font-bold text-lg">{selectedAmbulance.speed?.toFixed(0) || 0} km/h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                      <Route className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-slate-400 text-sm">Heading</p>
                        <p className="text-white font-bold text-lg">{selectedAmbulance.heading?.toFixed(0) || 0}°</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-slate-400 text-sm">GPS Coordinates</p>
                      <p className="text-white font-mono">
                        {selectedAmbulance.current_lat?.toFixed(6)}, {selectedAmbulance.current_lng?.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  {selectedAmbulance.destination_name && (
                    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                      <Building2 className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="text-slate-400 text-sm">Destination</p>
                        <p className="text-white font-medium">{selectedAmbulance.destination_name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-slate-400 text-sm">Last Updated</p>
                      <p className="text-white font-medium">
                        {new Date(selectedAmbulance.last_updated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Release Button */}
              {selectedAmbulance.status !== 'Available' && (
                <Card className="bg-slate-900 border-slate-700">
                  <CardContent className="p-4">
                    <Button
                      variant="outline"
                      className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                      onClick={() => handleReleaseAmbulance(selectedAmbulance.id, selectedAmbulance.vehicle_number)}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Release Ambulance
                    </Button>
                    <p className="text-slate-400 text-xs mt-2 text-center">
                      Make this ambulance available for new emergencies
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Ambulance Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAmbulances.map((ambulance) => (
            <Card
              key={ambulance.id}
              className={`bg-slate-900 border-2 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 ${getStatusColor(ambulance.status)}`}
              onClick={() => setSelectedAmbulanceId(ambulance.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg">{ambulance.vehicle_number}</h3>
                  <Badge className={`${getStatusBadgeColor(ambulance.status)} px-2 py-1 text-xs`}>
                    {ambulance.status}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300 text-sm">{ambulance.driver_name || 'No driver assigned'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300 text-sm">{ambulance.care_type || 'Standard Care'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-slate-400" />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            (ambulance.battery_percentage || 0) > 50 ? 'bg-green-500' :
                            (ambulance.battery_percentage || 0) > 20 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${ambulance.battery_percentage || 0}%` }}
                        />
                      </div>
                      <span className="text-slate-300 text-sm">{ambulance.battery_percentage || 0}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300 text-sm font-mono">
                      {ambulance.current_lat?.toFixed(4)}, {ambulance.current_lng?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredAmbulances.length === 0 && (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">No ambulances found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}