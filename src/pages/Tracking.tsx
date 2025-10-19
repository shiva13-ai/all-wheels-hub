import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { Header } from "../components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { MapPin, Navigation, Phone, Route } from "lucide-react";

// --- Custom Hook to load Google Maps Script ---
const useGoogleMapsScript = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const existingScript = document.getElementById('google-maps-script');

    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=routes`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error("Google Maps script failed to load.");
    
    document.head.appendChild(script);

    return () => {
      // Clean up script if component unmounts, though usually we want it to persist.
      const scriptTag = document.getElementById('google-maps-script');
      if (scriptTag) {
        // document.head.removeChild(scriptTag);
      }
    };
  }, [apiKey]);

  return isLoaded;
};


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

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function Tracking() {
  const { bookingId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const userMarker = useRef<google.maps.Marker | null>(null);
  const mechanicMarker = useRef<google.maps.Marker | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);

  const isMapLoaded = useGoogleMapsScript(GOOGLE_MAPS_API_KEY);


  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchBookingDetails();
    const subscription = subscribeToBookingUpdates();

    // Update mechanic location every 10 seconds if they're the mechanic
    let locationInterval: NodeJS.Timeout | undefined;
    if (profile?.role === "mechanic") {
      locationInterval = setInterval(updateMechanicLocation, 10000);
    }

    return () => {
      if (locationInterval) clearInterval(locationInterval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [bookingId, user, profile]);

  // Effect for initializing the map once the script is loaded and we have data
  useEffect(() => {
    if (isMapLoaded && booking && mapRef.current && !mapInstance.current) {
        const userLocation = booking.latitude && booking.longitude ? { lat: booking.latitude, lng: booking.longitude } : { lat: 17.385, lng: 78.4867 };
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: userLocation,
            zoom: 14,
        });

        // Initialize the DirectionsRenderer
        directionsRenderer.current = new window.google.maps.DirectionsRenderer({
            map: mapInstance.current,
            suppressMarkers: true, // We use our own markers
            polylineOptions: {
                strokeColor: '#2563eb',
                strokeOpacity: 0.8,
                strokeWeight: 5
            }
        });
    }
  }, [isMapLoaded, booking]);

  // Effect for updating markers and polylines when booking data changes
  useEffect(() => {
    if (!mapInstance.current || !booking || !directionsRenderer.current) return;

    const userPosition = booking.latitude && booking.longitude ? { lat: booking.latitude, lng: booking.longitude } : null;
    const mechanicPosition = booking.mechanic_latitude && booking.mechanic_longitude ? { lat: booking.mechanic_latitude, lng: booking.mechanic_longitude } : null;

    // Update user marker
    if (userPosition) {
        if (!userMarker.current) {
            userMarker.current = new window.google.maps.Marker({
                position: userPosition,
                map: mapInstance.current,
                label: 'U',
                title: 'User Location'
            });
        } else {
            userMarker.current.setPosition(userPosition);
        }
    }

    // Update mechanic marker
    if (mechanicPosition) {
        if (!mechanicMarker.current) {
            mechanicMarker.current = new window.google.maps.Marker({
                position: mechanicPosition,
                map: mapInstance.current,
                label: 'M',
                title: 'Mechanic Location',
                icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });
        } else {
            mechanicMarker.current.setPosition(mechanicPosition);
        }
        // Pan map to mechanic if you are the user
        if (profile?.role === 'user') {
            mapInstance.current.panTo(mechanicPosition);
        }
    }
    
    // Calculate and display route
    if (userPosition && mechanicPosition) {
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: mechanicPosition,
                destination: userPosition,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK && directionsRenderer.current) {
                    directionsRenderer.current.setDirections(result);
                } else {
                    console.error(`error fetching directions ${result}`);
                }
            }
        );
    }

  }, [booking, profile?.role]);


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

    return channel;
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

                {isMechanic && booking.status === "confirmed" && (
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
                {isMapLoaded ? (
                  <div ref={mapRef} style={{ width: "100%", height: "520px" }} />
                ) : (
                  <div className="flex items-center justify-center h-[520px]">Loading Map...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

