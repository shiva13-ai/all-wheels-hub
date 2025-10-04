import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapPickerProps {
  onLocationSelect: (location: string, latitude: number, longitude: number) => void;
  initialLat?: number;
  initialLng?: number;
}

function LocationMarker({ 
  position, 
  setPosition 
}: { 
  position: LatLng | null; 
  setPosition: (pos: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export const LocationMapPicker = ({ 
  onLocationSelect, 
  initialLat = 28.6139, 
  initialLng = 77.2090 
}: LocationMapPickerProps) => {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([initialLat, initialLng]);

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = new LatLng(pos.coords.latitude, pos.coords.longitude);
        setPosition(newPos);
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        toast.success("Current location detected!");
        setIsGettingLocation(false);
      },
      (error) => {
        toast.error("Failed to get location: " + error.message);
        setIsGettingLocation(false);
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
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          key={`${mapCenter[0]}-${mapCenter[1]}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
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
