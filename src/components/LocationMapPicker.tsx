import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// --- Helper hook to load the Google Maps script ---
const useGoogleMapsScript = (apiKey: string) => {
    const [isLoaded, setIsLoaded] = useState(!!(window.google && window.google.maps));
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (isLoaded) return;
        
        if (!apiKey) {
            const err = new Error('Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
            setError(err);
            console.error(err);
            toast.error(err.message);
            return;
        }

        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
            const checkReady = () => {
                if (window.google && window.google.maps) {
                    setIsLoaded(true);
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => setIsLoaded(true);

        script.onerror = () => {
            const err = new Error('Google Maps script could not be loaded.');
            setError(err);
            toast.error(err.message);
        };

        document.head.appendChild(script);

    }, [isLoaded, apiKey]);

    return { isLoaded, error };
};


interface LocationMapPickerProps {
  onLocationSelect: (location: string, latitude: number, longitude: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export const LocationMapPicker = ({ 
  onLocationSelect, 
  initialLat = 17.3850, // Hyderabad
  initialLng = 78.4867 
}: LocationMapPickerProps) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  const { isLoaded, error: scriptError } = useGoogleMapsScript(GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      });

      newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });
      setMap(newMap);
    }
  }, [isLoaded, map, initialLat, initialLng]);
  
  useEffect(() => {
      if (map && position) {
          if (!marker) {
              const newMarker = new window.google.maps.Marker({
                  position,
                  map,
              });
              setMarker(newMarker);
          } else {
              marker.setPosition(position);
          }
          map.panTo(position);
          map.setZoom(15);
      }
  }, [map, position, marker]);


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
        const accuracy = Math.round(pos.coords.accuracy);
        setPosition(newPos);
        if(map) {
            map.setCenter(newPos);
            map.setZoom(15);
        }
        
        if (accuracy > 1000) {
          toast.warning(`Location may be inaccurate (±${accuracy}m). Please verify on map or click to select your exact location.`, {
            duration: 5000
          });
        } else {
          toast.success(`Location detected! (±${accuracy}m accuracy)`);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
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
    if (!position || !window.google) {
      toast.error("Please select a location on the map");
      return;
    }

    try {
      // Use Google's reverse geocoding to get address
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
           const address = results[0].formatted_address;
           onLocationSelect(address, position.lat, position.lng);
           toast.success("Location confirmed!");
        } else {
            toast.error("Failed to get location address.");
             const fallbackAddress = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
            onLocationSelect(fallbackAddress, position.lat, position.lng);
        }
      });
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
          disabled={isGettingLocation || !isLoaded}
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
        {!isLoaded || scriptError ? (
          <div className="flex items-center justify-center h-full bg-muted text-sm text-muted-foreground">
            {scriptError ? scriptError.message : 'Loading map...'}
          </div>
        ) : (
          <div ref={mapRef} style={mapContainerStyle} />
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

