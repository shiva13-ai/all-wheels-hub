import React, { useEffect, useState, useRef } from 'react';
// Use relative path to avoid alias issues
import { supabase } from '../integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, User } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// --- Helper hook to load the Google Maps script ---
const useGoogleMapsScript = (apiKey: string) => {
    const [isLoaded, setIsLoaded] = useState(window.google && window.google.maps);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (isLoaded) return;

        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
            setIsLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            setIsLoaded(true);
        };
        
        script.onerror = () => {
            setError(new Error('Google Maps script could not be loaded.'));
        };

        document.head.appendChild(script);

        return () => {
            const scriptTag = document.getElementById('google-maps-script');
            if (scriptTag) {
                // In some strict environments, you might not want to remove it 
                // if it could be used by other components.
                // document.head.removeChild(scriptTag);
            }
        };
    }, [isLoaded, apiKey]);

    return { isLoaded, error };
};
// --- End of helper hook ---


interface LiveLocationMapProps {
  bookingId?: string;
  sosRequestId?: string;
  userRole: 'user' | 'mechanic';
}

interface LocationData {
  userLat?: number;
  userLng?: number;
  mechanicLat?: number;
  mechanicLng?: number;
  location?: string;
}

const LiveLocationMap: React.FC<LiveLocationMapProps> = ({
  bookingId,
  sosRequestId,
  userRole,
}) => {
  const [locationData, setLocationData] = useState<LocationData>({});
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [mechanicMarker, setMechanicMarker] = useState<google.maps.Marker | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  
  const { isLoaded, error: scriptError } = useGoogleMapsScript(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  // Get current position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setCurrentPosition({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi
        }
      );
    } else {
      setCurrentPosition({ lat: 28.6139, lng: 77.2090 });
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (isLoaded && mapRef.current && !map) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: currentPosition || { lat: 28.6139, lng: 77.2090 },
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      });
      setMap(newMap);
      setInfoWindow(new window.google.maps.InfoWindow());
    }
  }, [isLoaded, map, currentPosition]);

  // Fetch initial location data
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const table = bookingId ? 'bookings' : 'sos_requests';
        const id = bookingId || sosRequestId;

        if(!id) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
          .from(table)
          .select('latitude, longitude, mechanic_latitude, mechanic_longitude, location')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setLocationData({
            userLat: data.latitude,
            userLng: data.longitude,
            mechanicLat: data.mechanic_latitude,
            mechanicLng: data.mechanic_longitude,
            location: data.location,
          });
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationData();
  }, [bookingId, sosRequestId]);

  // Subscribe to real-time location updates
  useEffect(() => {
    const table = bookingId ? 'bookings' : 'sos_requests';
    const id = bookingId || sosRequestId;

    if(!id) return;

    const channel = supabase
      .channel(`location-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setLocationData({
            userLat: newData.latitude,
            userLng: newData.longitude,
            mechanicLat: newData.mechanic_latitude,
            mechanicLng: newData.mechanic_longitude,
            location: newData.location,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, sosRequestId]);

  // Update mechanic's location in real-time
  useEffect(() => {
    if (userRole !== 'mechanic' || !currentPosition) return;

    const updateLocation = async () => {
      const table = bookingId ? 'bookings' : 'sos_requests';
      const id = bookingId || sosRequestId;
      if (!id) return;

      await supabase
        .from(table)
        .update({
          mechanic_latitude: currentPosition.lat,
          mechanic_longitude: currentPosition.lng,
          mechanic_last_location_update: new Date().toISOString(),
        })
        .eq('id', id);
    };

    const interval = setInterval(updateLocation, 10000);
    updateLocation(); // Update immediately

    return () => clearInterval(interval);
  }, [userRole, currentPosition, bookingId, sosRequestId]);

  // Update Markers and InfoWindows
  useEffect(() => {
    if (!map || !infoWindow) return;

    const userPos = locationData.userLat && locationData.userLng ? { lat: locationData.userLat, lng: locationData.userLng } : null;
    const mechanicPos = locationData.mechanicLat && locationData.mechanicLng ? { lat: locationData.mechanicLat, lng: locationData.mechanicLng } : null;
    
    // Update or create User Marker
    if(userPos) {
        if(!userMarker) {
            const marker = new window.google.maps.Marker({
                position: userPos,
                map,
                label: 'U',
                title: 'User Location'
            });
            marker.addListener('click', () => {
                infoWindow.setContent(`
                    <div class="flex items-center gap-2 p-1 font-sans">
                        <div class="font-semibold">User Location</div>
                    </div>
                `);
                infoWindow.open(map, marker);
            });
            setUserMarker(marker);
        } else {
            userMarker.setPosition(userPos);
        }
    } else if(userMarker) {
        userMarker.setMap(null);
        setUserMarker(null);
    }
    
    // Update or create Mechanic Marker
    if(mechanicPos) {
        if(!mechanicMarker) {
            const marker = new window.google.maps.Marker({
                position: mechanicPos,
                map,
                label: 'M',
                title: 'Mechanic Location',
                icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });
             marker.addListener('click', () => {
                infoWindow.setContent(`
                    <div class="flex items-center gap-2 p-1 font-sans">
                        <div class="font-semibold">Mechanic Location</div>
                    </div>
                `);
                infoWindow.open(map, marker);
            });
            setMechanicMarker(marker);
        } else {
            mechanicMarker.setPosition(mechanicPos);
        }
    } else if(mechanicMarker) {
        mechanicMarker.setMap(null);
        setMechanicMarker(null);
    }

    // Center map
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    if (userPos) { bounds.extend(userPos); hasPoints = true; }
    if (mechanicPos) { bounds.extend(mechanicPos); hasPoints = true; }

    if (hasPoints) {
        if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            map.setCenter(bounds.getCenter());
            map.setZoom(15);
        } else {
            map.fitBounds(bounds);
        }
    } else if (currentPosition) {
        map.setCenter(currentPosition);
    }

  }, [map, infoWindow, locationData, currentPosition]);


  if (loading || !currentPosition || scriptError) {
    return (
      <Card className="flex items-center justify-center h-96 bg-card">
        {scriptError ? 
            <p className="text-destructive text-sm p-4">Error loading map. Please check your API key and internet connection.</p> :
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        }
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-96 bg-card">
        <div ref={mapRef} style={mapContainerStyle} />
    </Card>
  );
};

export default LiveLocationMap;

