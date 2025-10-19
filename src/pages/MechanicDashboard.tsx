import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Car, CheckCircle, XCircle, Eye, History } from "lucide-react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { getDistance } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const NEARBY_RADIUS_KM = 50; // 50km radius for nearby requests

export default function MechanicDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [filteredPendingRequests, setFilteredPendingRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 17.385, lng: 78.4867 });
  const [mechanicLocation, setMechanicLocation] = useState<{ lat: number; lng: number } | null>(null);

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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMechanicLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting mechanic location: ", error);
          toast({
            title: "Could not get your location",
            description: "Showing all requests. Please enable location services for better results.",
            variant: "destructive"
          });
        }
      );
    }

    fetchDashboardData();
    const subscription = subscribeToRequests();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user, profile, navigate, toast]);

  useEffect(() => {
    if (mechanicLocation && pendingRequests.length > 0) {
      const nearby = pendingRequests.filter(request => {
        if (request.latitude && request.longitude) {
          const distance = getDistance(
            mechanicLocation.lat,
            mechanicLocation.lng,
            request.latitude,
            request.longitude
          );
          return distance <= NEARBY_RADIUS_KM;
        }
        return false;
      });
      setFilteredPendingRequests(nearby);
      if (nearby.length > 0 && nearby[0].latitude && nearby[0].longitude) {
        setMapCenter({ lat: nearby[0].latitude, lng: nearby[0].longitude });
      } else if (pendingRequests.length > 0 && pendingRequests[0].latitude && pendingRequests[0].longitude) {
        setMapCenter({ lat: pendingRequests[0].latitude, lng: pendingRequests[0].longitude });
      }
    } else {
      setFilteredPendingRequests(pendingRequests);
       if (pendingRequests.length > 0 && pendingRequests[0].latitude && pendingRequests[0].longitude) {
        setMapCenter({
          lat: pendingRequests[0].latitude,
          lng: pendingRequests[0].longitude,
        });
      }
    }
  }, [pendingRequests, mechanicLocation]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch pending requests
      const { data: pendingData, error: pendingError } = await supabase
        .from("bookings")
        .select(`
          *,
          customer_profile:profiles!user_id (full_name, phone)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      
      const transformedPending = (pendingData || []).map((booking: any) => ({
        ...booking,
        customer_profile: Array.isArray(booking.customer_profile) ? booking.customer_profile[0] : booking.customer_profile
      }));
      setPendingRequests(transformedPending as Booking[]);

      if (user) {
        // Fetch accepted/in-progress requests
        const { data: acceptedData, error: acceptedError } = await supabase
          .from("bookings")
          .select(`
            *,
            customer_profile:profiles!user_id (full_name, phone)
          `)
          .eq("mechanic_id", user.id)
          .in("status", ["confirmed", "in_progress"])
          .order("created_at", { ascending: false });

        if (acceptedError) throw acceptedError;
        
        const transformedAccepted = (acceptedData || []).map((booking: any) => ({
          ...booking,
          customer_profile: Array.isArray(booking.customer_profile) ? booking.customer_profile[0] : booking.customer_profile
        }));
        setAcceptedBookings(transformedAccepted as Booking[]);

        // Fetch past (completed/cancelled) requests
        const { data: pastData, error: pastError } = await supabase
          .from("bookings")
          .select(`
            *,
            customer_profile:profiles!user_id (full_name, phone)
          `)
          .eq("mechanic_id", user.id)
          .in("status", ["completed", "cancelled", "rejected"])
          .order("created_at", { ascending: false });
        
        if (pastError) throw pastError;

        const transformedPast = (pastData || []).map((booking: any) => ({
            ...booking,
            customer_profile: Array.isArray(booking.customer_profile) ? booking.customer_profile[0] : booking.customer_profile
        }));
        setPastBookings(transformedPast as Booking[]);
      }

    } catch (error: any) {
      toast({
        title: "Error fetching dashboard data",
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
        },
        (payload) => {
           // Check for cancellations to notify mechanic
          if (payload.eventType === 'UPDATE') {
            const oldStatus = (payload.old as any)?.status;
            const newStatus = (payload.new as any)?.status;
            if (oldStatus === 'pending' && newStatus === 'cancelled') {
              const bookingDetails = payload.new as Booking;
               fetchDashboardData(); // Refetch to get customer name if not available
               const customerName = bookingDetails.customer_profile?.full_name || 'A user';
               toast({
                title: "Request Cancelled",
                description: `${customerName} cancelled their service request for "${bookingDetails.service_type}".`
              })
            }
          }
          // Refetch to update all lists
          fetchDashboardData();
        }
      )
      .subscribe();

    return channel;
  };

  const handleAcceptRequest = async (bookingId: string) => {
     if (!("geolocation" in navigator)) {
      toast({
        title: "Geolocation Not Supported",
        description:
          "Your browser does not support location services, which are required to accept requests.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { error } = await supabase
            .from("bookings")
            .update({
              mechanic_id: user?.id,
              status: "confirmed", // Use 'confirmed' status
              mechanic_latitude: position.coords.latitude,
              mechanic_longitude: position.coords.longitude,
              mechanic_last_location_update: new Date().toISOString(),
            })
            .eq("id", bookingId);

          if (error) throw error;

          toast({
            title: "Request Accepted",
            description:
              "You can now see the customer's location and navigate to them.",
          });

          navigate(`/tracking/${bookingId}`);
        } catch (error: any) {
          toast({
            title: "Error Accepting Request",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        toast({
          title: "Location Error",
          description:
            "Please enable location services to accept requests. " +
            error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    );
  };

  const handleRejectRequest = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "rejected" })
        .eq("id", bookingId)
        .eq("status", "pending"); // Explicitly check that we're only updating a pending request

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "The request has been removed from your dashboard.",
      });
      // Manually remove the request from the local state for a faster UI update
      setPendingRequests((prevRequests) => prevRequests.filter((req) => req.id !== bookingId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'completed': return 'default';
        case 'cancelled': return 'secondary';
        case 'rejected': return 'destructive';
        default: return 'outline';
    }
  }

  if (loading && pendingRequests.length === 0 && acceptedBookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20 space-y-12">
        
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Jobs</TabsTrigger>
            <TabsTrigger value="history">Job History</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6">
            {acceptedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">You have no active jobs right now.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {acceptedBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg">{booking.service_type}</span>
                        <Badge>{booking.status}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Location</p>
                          <p className="text-sm text-muted-foreground">{booking.location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Customer</p>
                          <p className="text-sm text-muted-foreground">{booking.customer_profile?.full_name || "User"}</p>
                          <p className="text-sm text-muted-foreground">{booking.customer_profile?.phone}</p>
                        </div>
                      </div>
                      <Button onClick={() => navigate(`/tracking/${booking.id}`)} className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Track Live
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">You have no past jobs.</p>
                </CardContent>
              </Card>
            ) : (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg">{booking.service_type}</span>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                       <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Location</p>
                          <p className="text-sm text-muted-foreground">{booking.location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Customer</p>
                          <p className="text-sm text-muted-foreground">{booking.customer_profile?.full_name || "User"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Section for Nearby Pending Requests */}
        <div>
          <h1 className="text-3xl font-bold mb-6">Nearby Service Requests</h1>
          {filteredPendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No nearby pending requests at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {filteredPendingRequests.map((request) => (
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
                    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                      <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "520px" }}
                        center={mapCenter}
                        zoom={12}
                      >
                        {filteredPendingRequests
                          .filter((r) => r.latitude && r.longitude)
                          .map((request) => (
                            <Marker
                              key={request.id}
                              position={{
                                lat: request.latitude!,
                                lng: request.longitude!,
                              }}
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
    </div>
  );
}

