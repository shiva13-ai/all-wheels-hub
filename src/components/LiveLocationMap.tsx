import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, User } from 'lucide-react';

// Fix for default marker icons in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

const LiveLocationMap: React.FC<LiveLocationMapProps> = ({
  bookingId,
  sosRequestId,
  userRole,
}) => {
  const [locationData, setLocationData] = useState<LocationData>({});
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);

  // Get current position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCurrentPosition(pos);
        },
        (error) => {
          console.error('Error getting location:', error);
          setCurrentPosition([28.6139, 77.2090]); // Default to Delhi
        }
      );
    } else {
      setCurrentPosition([28.6139, 77.2090]);
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
          mechanic_latitude: currentPosition[0],
          mechanic_longitude: currentPosition[1],
          mechanic_last_location_update: new Date().toISOString(),
        })
        .eq('id', id);
    };

    // Update location every 10 seconds
    const interval = setInterval(updateLocation, 10000);
    updateLocation(); // Update immediately

    return () => clearInterval(interval);
  }, [userRole, currentPosition, bookingId, sosRequestId]);

  if (loading || !currentPosition) {
    return (
      <Card className="flex items-center justify-center h-96 bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  const mapCenter: [number, number] = 
    (userRole === 'user' && locationData.mechanicLat && locationData.mechanicLng)
      ? [locationData.mechanicLat, locationData.mechanicLng]
      : (locationData.userLat && locationData.userLng)
      ? [locationData.userLat, locationData.userLng]
      : currentPosition;

  return (
    <Card className="overflow-hidden h-96 bg-card">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={mapCenter} />
        
        {/* User Location Marker */}
        {locationData.userLat && locationData.userLng && (
          <Marker position={[locationData.userLat, locationData.userLng]}>
            <Popup>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <div>
                  <p className="font-semibold">User Location</p>
                  <p className="text-sm text-muted-foreground">{locationData.location}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Mechanic Location Marker */}
        {locationData.mechanicLat && locationData.mechanicLng && (
          <Marker position={[locationData.mechanicLat, locationData.mechanicLng]}>
            <Popup>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-semibold">Mechanic Location</p>
                  <p className="text-sm text-muted-foreground">Live tracking</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </Card>
  );
};

export default LiveLocationMap;