export interface HospitalCapacity {
  total_beds: number;
  available_beds: number;
  icu_beds: number;
  icu_available: number;
  occupied_beds: number;
  incoming_ambulances: number;
  occupancy_percentage: number;
}

class HospitalCapacityEngine {
  private capacityMap = new Map<string, HospitalCapacity>();
  private intervalId: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'hospital_capacity_data';
  private readonly UPDATE_INTERVAL = 90000; // 90 seconds

  constructor() {
    this.loadFromStorage();
    this.startSimulation();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.capacityMap = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load hospital capacity from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.capacityMap);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save hospital capacity to storage:', error);
    }
  }

  private getHospitalType(hospitalName: string): 'government' | 'private_super' | 'private' {
    const name = hospitalName.toLowerCase();
    if (name.includes('government') || name.includes('civil') || name.includes('district')) {
      return 'government';
    }
    if (name.includes('super') || name.includes('max') || name.includes('apollo') || name.includes('fortis')) {
      return 'private_super';
    }
    return 'private';
  }

  private initializeHospitalCapacity(hospitalId: string, hospitalName: string): HospitalCapacity {
    const type = this.getHospitalType(hospitalName);
    
    let total_beds: number;
    let icu_beds: number;
    
    switch (type) {
      case 'government':
        total_beds = Math.floor(Math.random() * 100) + 200; // 200-300
        icu_beds = Math.floor(Math.random() * 20) + 30; // 30-50
        break;
      case 'private_super':
        total_beds = Math.floor(Math.random() * 150) + 150; // 150-300
        icu_beds = Math.floor(Math.random() * 25) + 25; // 25-50
        break;
      default: // private
        total_beds = Math.floor(Math.random() * 80) + 50; // 50-130
        icu_beds = Math.floor(Math.random() * 15) + 10; // 10-25
        break;
    }

    const occupied_beds = Math.floor(total_beds * (0.4 + Math.random() * 0.4)); // 40-80% occupancy
    const occupied_icu = Math.floor(icu_beds * (0.3 + Math.random() * 0.5)); // 30-80% ICU occupancy
    
    const capacity: HospitalCapacity = {
      total_beds,
      available_beds: total_beds - occupied_beds,
      icu_beds,
      icu_available: icu_beds - occupied_icu,
      occupied_beds,
      incoming_ambulances: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
      occupancy_percentage: Math.round((occupied_beds / total_beds) * 100)
    };

    this.capacityMap.set(hospitalId, capacity);
    this.saveToStorage();
    return capacity;
  }

  private updateHospitalCapacity(hospitalId: string): void {
    const current = this.capacityMap.get(hospitalId);
    if (!current) return;

    // Beds change by ±0-3
    const bedChange = Math.floor(Math.random() * 7) - 3; // -3 to +3
    let newAvailableBeds = current.available_beds + bedChange;
    newAvailableBeds = Math.max(0, Math.min(current.total_beds, newAvailableBeds));

    // ICU change by ±0-1
    const icuChange = Math.floor(Math.random() * 3) - 1; // -1 to +1
    let newIcuAvailable = current.icu_available + icuChange;
    newIcuAvailable = Math.max(0, Math.min(current.icu_beds, newIcuAvailable));

    // Incoming ambulances change by ±0-1
    const ambulanceChange = Math.floor(Math.random() * 3) - 1; // -1 to +1
    let newIncomingAmbulances = current.incoming_ambulances + ambulanceChange;
    newIncomingAmbulances = Math.max(0, newIncomingAmbulances);

    const occupied_beds = current.total_beds - newAvailableBeds;
    const occupancy_percentage = Math.round((occupied_beds / current.total_beds) * 100);

    const updated: HospitalCapacity = {
      ...current,
      available_beds: newAvailableBeds,
      icu_available: newIcuAvailable,
      occupied_beds,
      incoming_ambulances: newIncomingAmbulances,
      occupancy_percentage
    };

    this.capacityMap.set(hospitalId, updated);
  }

  private startSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.capacityMap.forEach((_, hospitalId) => {
        this.updateHospitalCapacity(hospitalId);
      });
      this.saveToStorage();
    }, this.UPDATE_INTERVAL);
  }

  public getCapacity(hospitalId: string, hospitalName: string): HospitalCapacity {
    if (!this.capacityMap.has(hospitalId)) {
      return this.initializeHospitalCapacity(hospitalId, hospitalName);
    }
    return this.capacityMap.get(hospitalId)!;
  }

  public getAllCapacities(): Map<string, HospitalCapacity> {
    return new Map(this.capacityMap);
  }

  public destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Singleton instance
export const hospitalCapacityEngine = new HospitalCapacityEngine();