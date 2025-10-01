import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

interface LocationSearchProps {
  onLocationSelect: (location: string) => void;
}

export const LocationSearch = ({ onLocationSelect }: LocationSearchProps) => {
  const [location, setLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
          );
          const data = await response.json();
          const address = data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`;
          setLocation(address);
          onLocationSelect(address);
          toast.success("Location detected!");
        } catch (error) {
          toast.error("Failed to get location address");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        toast.error("Failed to get location: " + error.message);
        setIsGettingLocation(false);
      }
    );
  };

  const handleSearch = () => {
    if (location.trim()) {
      onLocationSelect(location);
    } else {
      toast.error("Please enter a location");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
      <div className="relative flex-1">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Enter your location or city..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-10 h-12"
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="h-12"
        >
          <Navigation className="w-4 h-4 mr-2" />
          {isGettingLocation ? "Getting..." : "Use Current"}
        </Button>
        <Button
          variant="cta"
          size="lg"
          onClick={handleSearch}
          className="h-12"
        >
          Search Mechanics
        </Button>
      </div>
    </div>
  );
};
