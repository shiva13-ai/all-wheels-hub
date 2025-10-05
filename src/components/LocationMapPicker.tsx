import { useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Button } from './ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

interface LocationMapPickerProps {
  onLocationSelect: (location: string, latitude: number, longitude: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export const LocationMapPicker = ({ 
  onLocationSelect, 
  initialLat = 28.6139, 
  initialLng = 77.2090 
}: LocationMapPickerProps) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: initialLat, lng: initialLng });
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyCB-fLf_OBqt6Y-zivznCupmZV6iB1HGzg',
  });

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        setMapCenter(newPos);
        toast.success("Current location detected!");
        setIsGettingLocation(false);
      },
      (error) => {
        toast.error("Failed to get location: " + error.message);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleConfirmLocation = async () => {
    if (!position) {
      toast.error("Please select a location on the map");
      return;
    }

    try {
      // Use reverse geocoding to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${position.lat}&lon=${position.lng}&format=json`
      );
      const data = await response.json();
      const address = data.display_name || `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
      
      onLocationSelect(address, position.lat, position.lng);
      toast.success("Location confirmed!");
    } catch (error) {
      toast.error("Failed to get location address");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="flex-1"
        >
          <Navigation className="w-4 h-4 mr-2" />
          {isGettingLocation ? "Getting..." : "Use Current Location"}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleConfirmLocation}
          disabled={!position}
          className="flex-1"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Confirm Location
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border border-border h-[300px]">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={13}
            onClick={(e) => {
              if (e.latLng) {
                setPosition({
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                });
              }
            }}
          >
            {position && <Marker position={position} />}
          </GoogleMap>
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            Loading map...
          </div>
        )}
      </div>

      {position && (
        <p className="text-xs text-muted-foreground text-center">
          Selected: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
      <p className="text-xs text-muted-foreground text-center">
        Click on the map to select your location
      </p>
    </div>
  );
};
