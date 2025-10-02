import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LiveLocationMap from './LiveLocationMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Wrench } from 'lucide-react';

interface Booking {
  id: string;
  service_type: string;
  location: string;
  status: string;
  vehicle_type: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

const LocationTrackingView: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveBookings();
  }, [user, profile]);

  const fetchActiveBookings = async () => {
    if (!user) return;

    try {
      const isMechanic = profile?.role === 'mechanic';
      
      let query;
      if (isMechanic) {
        query = supabase
          .from('bookings')
          .select(`
            *,
            profiles!bookings_user_id_fkey(full_name, phone)
          `)
          .eq('mechanic_id', user.id)
          .in('status', ['confirmed', 'in_progress']);
      } else {
        query = supabase
          .from('bookings')
          .select(`
            *,
            profiles!bookings_mechanic_id_fkey(full_name, phone)
          `)
          .eq('user_id', user.id)
          .in('status', ['confirmed', 'in_progress']);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Format data to handle foreign key relations
      const formattedData = (data || []).map((booking: any) => ({
        ...booking,
        profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles
      })) as Booking[];
      
      setActiveBookings(formattedData);
    } catch (error) {
      console.error('Error fetching active bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeBookings.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-muted-foreground">No active bookings to track</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedBooking) {
    const booking = activeBookings.find((b) => b.id === selectedBooking);
    if (!booking) return null;

    return (
      <div className="container mx-auto p-4 space-y-4">
        <Button
          variant="outline"
          onClick={() => setSelectedBooking(null)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Location Tracking</span>
              <Badge variant={booking.status === 'in_progress' ? 'default' : 'secondary'}>
                {booking.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Service Type</p>
                <p className="font-medium">{booking.service_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Type</p>
                <p className="font-medium">{booking.vehicle_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{booking.location}</p>
              </div>
              {booking.profiles && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {profile?.role === 'mechanic' ? 'Customer' : 'Mechanic'}
                  </p>
                  <p className="font-medium">{booking.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">{booking.profiles.phone}</p>
                </div>
              )}
            </div>

            <LiveLocationMap
              bookingId={booking.id}
              userRole={profile?.role === 'mechanic' ? 'mechanic' : 'user'}
            />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {profile?.role === 'mechanic' ? (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>Your location is being shared with the customer</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span>Tracking mechanic's live location</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Active Service Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeBookings.map((booking) => (
              <Card key={booking.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => setSelectedBooking(booking.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{booking.service_type}</p>
                      <p className="text-sm text-muted-foreground">{booking.location}</p>
                      {booking.profiles && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {profile?.role === 'mechanic' ? 'Customer: ' : 'Mechanic: '}
                          {booking.profiles.full_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={booking.status === 'in_progress' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Click to track
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationTrackingView;