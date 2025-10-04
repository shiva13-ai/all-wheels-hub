import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, User } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

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
  const [selectedMarker, setSelectedMarker] = useState<'user' | 'mechanic' | null>(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

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

  // Fetch initial location data
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const table = bookingId ? 'bookings' : 'sos_requests';
        const id = bookingId || sosRequestId;

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

      await supabase
        .from(table)
        .update({
          mechanic_latitude: currentPosition.lat,
          mechanic_longitude: currentPosition.lng,
          mechanic_last_location_update: new Date().toISOString(),
        })
        .eq('id', id);
    };

    // Update location every 10 seconds
    const interval = setInterval(updateLocation, 10000);
    updateLocation(); // Update immediately

    return () => clearInterval(interval);
  }, [userRole, currentPosition, bookingId, sosRequestId]);

  if (loading || !currentPosition || !isLoaded) {
    return (
      <Card className="flex items-center justify-center h-96 bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  const mapCenter = 
    (userRole === 'user' && locationData.mechanicLat && locationData.mechanicLng)
      ? { lat: locationData.mechanicLat, lng: locationData.mechanicLng }
      : (locationData.userLat && locationData.userLng)
      ? { lat: locationData.userLat, lng: locationData.userLng }
      : currentPosition;

  return (
    <Card className="overflow-hidden h-96 bg-card">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={13}
      >
        {/* User Location Marker */}
        {locationData.userLat && locationData.userLng && (
          <Marker 
            position={{ lat: locationData.userLat, lng: locationData.userLng }}
            onClick={() => setSelectedMarker('user')}
          >
            {selectedMarker === 'user' && (
              <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                <div className="flex items-center gap-2 p-1">
                  <User className="w-4 h-4" />
                  <div>
                    <p className="font-semibold">User Location</p>
                    <p className="text-sm text-muted-foreground">{locationData.location}</p>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* Mechanic Location Marker */}
        {locationData.mechanicLat && locationData.mechanicLng && (
          <Marker 
            position={{ lat: locationData.mechanicLat, lng: locationData.mechanicLng }}
            onClick={() => setSelectedMarker('mechanic')}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }}
          >
            {selectedMarker === 'mechanic' && (
              <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                <div className="flex items-center gap-2 p-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-semibold">Mechanic Location</p>
                    <p className="text-sm text-muted-foreground">Live tracking</p>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}
      </GoogleMap>
    </Card>
  );
};

export default LiveLocationMap;