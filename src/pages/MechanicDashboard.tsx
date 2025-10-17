import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Car, CheckCircle, XCircle } from "lucide-react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

// NOTE: We alias the fetched profile data explicitly to 'customer_profile' and 
// specify the foreign key constraint to avoid the "couldn't find relationship" error.
interface Booking {
  id: string;
  user_id: string;
  service_type: string;
  vehicle_type: string;
  location: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  status: string;
  // Renamed to 'customer_profile' here to match the alias in the select query.
  customer_profile: {
    full_name: string;
    phone: string;
  } | null;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyANlH9ZOTkQ_xWPIBuDY-Ay0GuiQ1HY3kU";

export default function MechanicDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 17.385, lng: 78.4867 });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (profile?.role !== "mechanic") {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to mechanics.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchPendingRequests();
    subscribeToRequests();
  }, [user, profile]);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          customer_profile:profiles!user_id (full_name, phone)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map((booking: any) => ({
        ...booking,
        // Use the explicit alias 'customer_profile'
        customer_profile: Array.isArray(booking.customer_profile) ? booking.customer_profile[0] : booking.customer_profile
      }));
      
      // We need to cast the result to the expected Booking[] interface
      setRequests(transformedData as Booking[]);

      // Set map center to first request location if available
      if (transformedData && transformedData.length > 0 && transformedData[0].latitude && transformedData[0].longitude) {
        setMapCenter({
          lat: transformedData[0].latitude,
          lng: transformedData[0].longitude,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error fetching requests",
        description: error.message,
        variant: "destructive",
      });
      console.error("Supabase Query Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRequests = () => {
    const channel = supabase
      .channel("booking-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: "status=eq.pending",
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAcceptRequest = async (bookingId: string) => {
    try {
      // Get current location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { data, error } = await supabase
              .from("bookings")
              .update({
                mechanic_id: user?.id,
                status: "accepted",
                mechanic_latitude: position.coords.latitude,
                mechanic_longitude: position.coords.longitude,
                mechanic_last_location_update: new Date().toISOString(),
              })
              .eq("id", bookingId)
              .select()
              .single();

            if (error) throw error;

            toast({
              title: "Request Accepted",
              description: "You can now see the customer's location and navigate to them.",
            });

            navigate(`/tracking/${bookingId}`);
          },
          (error) => {
            toast({
              title: "Location Error",
              description: "Please enable location services to accept requests.",
              variant: "destructive",
            });
          }
        );
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "rejected" })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "The request has been rejected.",
      });
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
        <p>Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <h1 className="text-3xl font-bold mb-6">Service Requests</h1>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No pending requests at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">
                        {request.service_type} - {request.vehicle_type}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {new Date(request.created_at).toLocaleTimeString()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{request.location}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Customer</p>
                        <p className="text-sm text-muted-foreground">
                          {/* Use the new alias customer_profile */}
                          {request.customer_profile?.full_name || "User"}
                        </p>
                        <p className="text-sm text-muted-foreground">{request.customer_profile?.phone}</p>
                      </div>
                    </div>

                    {request.description && (
                      <div>
                        <p className="font-medium">Description</p>
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleRejectRequest(request.id)}
                        variant="outline"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:sticky lg:top-24 h-[600px]">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Request Locations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* The Google Maps component requires a specific API key variable that is expected to be present. 
                        If the map fails to load, ensure you have set the GOOGLE_MAPS_API_KEY environment variable. */}
                  <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "520px" }}
                      center={mapCenter}
                      zoom={12}
                    >
                      {requests
                        .filter((r) => r.latitude && r.longitude)
                        .map((request) => (
                          <Marker
                            key={request.id}
                            position={{
                              lat: request.latitude!,
                              lng: request.longitude!,
                            }}
                            // Use the new alias customer_profile
                            title={`${request.service_type} - ${request.customer_profile?.full_name}`}
                          />
                        ))}
                    </GoogleMap>
                  </LoadScript>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

