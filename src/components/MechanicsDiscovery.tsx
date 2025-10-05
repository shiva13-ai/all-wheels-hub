import { useState, useEffect } from "react";
import { LocationSearch } from "./LocationSearch";
import { MechanicCard } from "./MechanicCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { profilesService, UserProfile } from "@/services/supabase/profiles";
import { Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { BookingModal } from "./BookingModal";

export const MechanicsDiscovery = () => {
  const [mechanics, setMechanics] = useState<UserProfile[]>([]);
  const [filteredMechanics, setFilteredMechanics] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [selectedMechanic, setSelectedMechanic] = useState<string | null>(null);

  useEffect(() => {
    loadMechanics();
  }, []);

  useEffect(() => {
    filterAndSortMechanics();
  }, [mechanics, searchLocation, serviceFilter, sortBy]);

  const loadMechanics = async () => {
    setLoading(true);
    try {
      const { data, error } = await profilesService.getAllMechanics();
      if (error) throw error;
      setMechanics((data || []) as UserProfile[]);
    } catch (error) {
      toast.error("Failed to load mechanics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = async (location: string) => {
    setSearchLocation(location);
    setLoading(true);
    try {
      const { data, error } = serviceFilter 
        ? await profilesService.getMechanicsByService(serviceFilter, location)
        : await profilesService.getAllMechanics();
      
      if (error) throw error;
      
      const filtered = data?.filter(m => 
        m.location?.toLowerCase().includes(location.toLowerCase())
      ) || [];
      
      setMechanics(filtered as UserProfile[]);
      toast.success(`Found ${filtered.length} mechanics in ${location}`);
    } catch (error) {
      toast.error("Failed to search mechanics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortMechanics = () => {
    let filtered = [...mechanics];

    // Filter by service
    if (serviceFilter) {
      filtered = filtered.filter(m => 
        m.services_offered?.some(s => 
          s.toLowerCase().includes(serviceFilter.toLowerCase())
        )
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "reviews") return b.total_reviews - a.total_reviews;
      if (sortBy === "experience") return (b.experience_years || 0) - (a.experience_years || 0);
      return 0;
    });

    setFilteredMechanics(filtered);
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Find Mechanics Near You
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Search by location to discover verified mechanics in your area
          </p>
          
          <div className="flex justify-center mb-8">
            <LocationSearch onLocationSelect={handleLocationSelect} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between">
          <div className="flex flex-1 gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter by service..."
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="experience">Most Experience</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading mechanics...</p>
          </div>
        ) : filteredMechanics.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Showing {filteredMechanics.length} mechanic{filteredMechanics.length !== 1 ? 's' : ''}
              {searchLocation && ` in ${searchLocation}`}
            </p>
            <div className="grid gap-6">
              {filteredMechanics.map((mechanic) => (
                <MechanicCard
                  key={mechanic.id}
                  mechanic={mechanic}
                  onBookService={setSelectedMechanic}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchLocation 
                ? `No mechanics found in ${searchLocation}. Try a different location.`
                : "Enter a location to find mechanics near you."}
            </p>
            <Button variant="outline" onClick={loadMechanics} className="mt-4">
              Show All Mechanics
            </Button>
          </div>
        )}
      </div>

      {selectedMechanic && (
        <BookingModal
          isOpen={!!selectedMechanic}
          onClose={() => setSelectedMechanic(null)}
          vehicleType="car"
          services={[
            { name: "AC Service", price: 1500 },
            { name: "Towing", price: 800 },
            { name: "Engine Diagnostics", price: 1200 },
            { name: "Brake Service", price: 1800 }
          ]}
          preSelectedMechanicId={selectedMechanic}
        />
      )}
    </section>
  );
};
