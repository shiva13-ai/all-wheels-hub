import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Phone } from "lucide-react";
import { GoogleMap, LoadScript, Marker, Polyline } from "@react-google-maps/api";

interface BookingDetails {
  id: string;
  user_id: string;
  mechanic_id: string;
  service_type: string;
  vehicle_type: string;
  location: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  mechanic_latitude: number | null;
  mechanic_longitude: number | null;
  mechanic_last_location_update: string | null;
  user_profile: {
    full_name: string;
    phone: string;
  } | null;
  mechanic_profile: {
    full_name: string;
    phone: string;
  } | null;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyDGSRDc8SQYqmJZwFNAUTb5E5AEeGxw9OQ";

export default function Tracking() {
  const { bookingId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchBookingDetails();
    subscribeToBookingUpdates();

    // Update mechanic location every 10 seconds if they're the mechanic
    let locationInterval: NodeJS.Timeout;
    if (profile?.role === "mechanic") {
      locationInterval = setInterval(updateMechanicLocation, 10000);
    }

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [bookingId, user, profile]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          user_profile:profiles!user_id(full_name, phone),
          mechanic_profile:profiles!mechanic_id(full_name, phone)
        `)
        .eq("id", bookingId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Not Found",
          description: "Booking not found.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Verify user is part of this booking
      if (data.user_id !== user?.id && data.mechanic_id !== user?.id) {
        toast({
          title: "Access Denied",
          description: "You don't have access to this booking.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Transform the data to match our interface
      const transformedData = {
        ...data,
        user_profile: Array.isArray(data.user_profile) ? data.user_profile[0] : data.user_profile,
        mechanic_profile: Array.isArray(data.mechanic_profile) ? data.mechanic_profile[0] : data.mechanic_profile
      };

      setBooking(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToBookingUpdates = () => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        () => {
          fetchBookingDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateMechanicLocation = () => {
    if ("geolocation" in navigator && profile?.role === "mechanic") {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await supabase
            .from("bookings")
            .update({
              mechanic_latitude: position.coords.latitude,
              mechanic_longitude: position.coords.longitude,
              mechanic_last_location_update: new Date().toISOString(),
            })
            .eq("id", bookingId);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const handleCompleteService = async () => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Service Completed",
        description: "The service has been marked as completed.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading tracking information...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Booking not found</p>
      </div>
    );
  }

  const mapCenter = {
    lat: booking.latitude || 17.385,
    lng: booking.longitude || 78.4867,
  };

  const isMechanic = profile?.role === "mechanic";
  const otherParty = isMechanic ? booking.user_profile : booking.mechanic_profile;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <h1 className="text-3xl font-bold mb-6">Live Tracking</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">Service Type</p>
                  <p className="text-sm text-muted-foreground">{booking.service_type}</p>
                </div>
                <div>
                  <p className="font-medium">Vehicle</p>
                  <p className="text-sm text-muted-foreground">{booking.vehicle_type}</p>
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-muted-foreground capitalize">{booking.status}</p>
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{booking.location}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isMechanic ? "Customer" : "Mechanic"} Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {otherParty?.full_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Phone</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(`tel:${otherParty?.phone}`)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {otherParty?.phone || "N/A"}
                  </Button>
                </div>

                {isMechanic && booking.status === "accepted" && (
                  <Button onClick={handleCompleteService} className="w-full">
                    Mark as Completed
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Live Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "520px" }}
                    center={mapCenter}
                    zoom={14}
                  >
                    {/* User marker */}
                    {booking.latitude && booking.longitude && (
                      <Marker
                        position={{
                          lat: booking.latitude,
                          lng: booking.longitude,
                        }}
                        label="U"
                        title="User Location"
                      />
                    )}

                    {/* Mechanic marker */}
                    {booking.mechanic_latitude && booking.mechanic_longitude && (
                      <Marker
                        position={{
                          lat: booking.mechanic_latitude,
                          lng: booking.mechanic_longitude,
                        }}
                        label="M"
                        title="Mechanic Location"
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                        }}
                      />
                    )}

                    {/* Line connecting both */}
                    {booking.latitude &&
                      booking.longitude &&
                      booking.mechanic_latitude &&
                      booking.mechanic_longitude && (
                        <Polyline
                          path={[
                            { lat: booking.latitude, lng: booking.longitude },
                            {
                              lat: booking.mechanic_latitude,
                              lng: booking.mechanic_longitude,
                            },
                          ]}
                          options={{
                            strokeColor: "#2563eb",
                            strokeOpacity: 0.8,
                            strokeWeight: 3,
                          }}
                        />
                      )}
                  </GoogleMap>
                </LoadScript>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
