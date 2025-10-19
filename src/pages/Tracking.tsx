import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; 
import { supabase } from "../integrations/supabase/client"; 
import { Header } from "../components/Header"; 
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { Loader2, MapPin, Navigation, Phone, MessageCircle } from "lucide-react";

// --- Helper Hook to Load Google Maps Script ---
const getGoogleMapsApiKey = () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const useGoogleMapsScript = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded || !apiKey) return;
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=routes`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps script. Check API key and network.");
    
    document.head.appendChild(script);

    return () => {
      // Basic cleanup logic here if needed
    };
  }, [apiKey, isLoaded]);

  return { isLoaded, error };
};
// --- End of helper hook ---


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
  
  user_profile: { full_name: string; phone: string; } | null;
  mechanic_profile: { full_name: string; phone: string; } | null;
}

// Helper to fetch a single profile by user_id
const fetchProfile = async (userId: string | null) => {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', userId)
        .maybeSingle();
    return data;
};

export default function Tracking() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  
  // Map References
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const userMarker = useRef<google.maps.Marker | null>(null);
  const mechanicMarker = useRef<google.maps.Marker | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);

  const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
  const { isLoaded: isMapScriptLoaded, error: mapLoadError } = useGoogleMapsScript(GOOGLE_MAPS_API_KEY);

  // --- Initial Setup and Data Fetching ---
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !bookingId) {
      navigate("/auth");
      return;
    }

    const loadInitialData = async () => {
      await fetchBookingDetails();
      // Only start the subscription and location interval after initial data load
      const subscription = subscribeToBookingUpdates();
      
      let locationInterval: NodeJS.Timeout | undefined;
      if (profile?.role === "mechanic") {
          locationInterval = setInterval(updateMechanicLocation, 10000); 
          updateMechanicLocation(); // Immediate update on load
      }
      
      return () => {
        if (locationInterval) clearInterval(locationInterval);
        if (subscription) supabase.removeChannel(subscription);
      };
    };

    const cleanup = loadInitialData();
    return () => { cleanup.then(c => c()) };

  }, [user, profile, authLoading, bookingId]);


  const fetchBookingDetails = async () => {
    try {
      // 1. Fetch base booking data (no joins)
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`*`)
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingError) throw bookingError;
      if (!bookingData) {
        toast({ title: "Not Found", description: "Booking not found.", variant: "destructive", });
        navigate("/");
        return;
      }

      // 2. Fetch Customer and Mechanic Profiles Separately (Fixes relationship error)
      const customerProfile = await fetchProfile(bookingData.user_id);
      const mechanicProfile = await fetchProfile(bookingData.mechanic_id);

      // 3. Combine and validate
      const transformedData = {
        ...bookingData,
        user_profile: customerProfile,
        mechanic_profile: mechanicProfile
      } as BookingDetails;

      if (transformedData.user_id !== user?.id && transformedData.mechanic_id !== user?.id) {
        toast({ title: "Access Denied", description: "You don't have access to this booking.", variant: "destructive", });
        navigate("/");
        return;
      }

      setBooking(transformedData);
    } catch (error: any) {
      console.error("Error fetching booking details:", error);
      toast({ title: "Error", description: "Failed to fetch booking details: " + error.message, variant: "destructive", });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToBookingUpdates = () => {
    // Only subscribe to changes in the location/status fields of this booking
    const channel = supabase
      .channel(`location-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload: any) => {
          // Direct state update to avoid re-running the full fetch/resetting loading state
          setBooking(prev => {
            if (!prev) return null;
            return {
                ...prev,
                ...payload.new
            }
          });
        }
      )
      .subscribe();

    return channel;
  };
  
  // --- Geolocation and Map Logic is unchanged and handles the update via 'booking' state change ---
  
  // Function to continuously update mechanic's location
  const updateMechanicLocation = () => {
    if ("geolocation" in navigator && profile?.role === "mechanic" && bookingId) {
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
          console.warn("Geolocation tracking error:", error.message);
        }
      );
    }
  };
  
  // --- Map Initialization and Update Logic (Unchanged) ---
  useEffect(() => {
    if (!isMapScriptLoaded || !booking || mapLoadError || !window.google) return;

    const userPos = booking.latitude && booking.longitude ? { lat: booking.latitude, lng: booking.longitude } : null;
    const mechanicPos = booking.mechanic_latitude && booking.mechanic_longitude ? { lat: booking.mechanic_latitude, lng: booking.mechanic_longitude } : null;

    if (!mapInstance.current && mapRef.current) {
        // Initialize Map
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: userPos || { lat: 17.385, lng: 78.4867 }, // Default to Hyderabad
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
        });

        // Initialize the DirectionsRenderer
        directionsRenderer.current = new window.google.maps.DirectionsRenderer({
            map: mapInstance.current,
            suppressMarkers: true, 
            polylineOptions: {
                strokeColor: '#2563eb', // Primary color for route
                strokeOpacity: 0.8,
                strokeWeight: 5
            }
        });
    }

    const map = mapInstance.current;
    
    // Update User Marker
    if (userPos) {
        if (!userMarker.current) {
            userMarker.current = new window.google.maps.Marker({
                position: userPos,
                map,
                label: 'U',
                title: 'Customer Location',
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            });
        } else {
            userMarker.current.setPosition(userPos);
        }
    } else if (userMarker.current) {
        userMarker.current.setMap(null);
        userMarker.current = null;
    }

    // Update Mechanic Marker and Route
    if (mechanicPos && userPos) {
        if (!mechanicMarker.current) {
            mechanicMarker.current = new window.google.maps.Marker({
                position: mechanicPos,
                map,
                label: 'M',
                title: 'Mechanic Location',
                icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });
        } else {
            mechanicMarker.current.setPosition(mechanicPos);
        }

        // Calculate and display route
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: mechanicPos,
                destination: userPos,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK && directionsRenderer.current) {
                    directionsRenderer.current.setDirections(result);
                    
                    const route = result.routes[0].legs[0];
                    if (route?.duration?.text) {
                        setEta(route.duration.text);
                    }
                } else {
                    console.error("Error fetching directions:", status);
                    setEta("N/A");
                }
            }
        );
        
        // Fit map bounds to show both markers
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(userPos);
        bounds.extend(mechanicPos);
        map.fitBounds(bounds);
        
    } else {
        // Clear route if either location is missing
        directionsRenderer.current?.setMap(null);
        directionsRenderer.current = null;
        if (mechanicMarker.current) {
            mechanicMarker.current.setMap(null);
            mechanicMarker.current = null;
        }
    }
    
    // Re-attach renderer if it was cleared previously (needed for updates)
    if (directionsRenderer.current && !directionsRenderer.current.getMap()) {
        directionsRenderer.current.setMap(map);
    }
    
  }, [isMapScriptLoaded, booking, mapLoadError]);

  const handleCompleteService = async () => {
    if (booking?.status !== 'confirmed' && booking?.status !== 'in_progress') return;
    
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed", final_cost: booking.estimated_cost || 0 })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Service Completed",
        description: "The service has been marked as completed and closed.",
      });

      navigate("/mechanic-dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg ml-3">Loading tracking information...</p>
      </div>
    );
  }
  
  if (mapLoadError) {
      return (
          <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto px-4 py-8 mt-20">
              <Card className="border-destructive bg-red-50/50 p-6">
                  <h1 className="text-xl font-bold text-destructive">Map Loading Failed</h1>
                  <p className="text-destructive/80 mt-2">Could not load the map component. This usually indicates an issue with the Google Maps API key or network restrictions. Please check your **.env** file and network connectivity.</p>
              </Card>
            </div>
          </div>
      );
  }

  if (!booking || booking.status === 'completed' || booking.status === 'cancelled') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-xl font-medium">Tracking ended.</p>
        <p className="text-muted-foreground">The service status is now: **{booking?.status || 'N/A'}**.</p>
        <Button onClick={() => navigate('/')} className="mt-6">Return to Home</Button>
      </div>
    );
  }

  const isMechanic = profile?.role === "mechanic";
  const otherParty = isMechanic ? booking.user_profile : booking.mechanic_profile;
  const currentStatus = booking.status.toUpperCase().replace('_', ' ');
  const showLiveRoute = booking.mechanic_id && (booking.status === 'confirmed' || booking.status === 'in_progress');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Navigation className="h-6 w-6" /> Live Tracking: {currentStatus}
        </h1>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Details Column */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle>{isMechanic ? "Customer" : "Mechanic"} ETA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-4xl font-extrabold">{eta || "Calculating..."}</p>
                <p className="text-sm opacity-80">Distance: {eta && directionsRenderer.current?.getDirections()?.routes[0]?.legs[0]?.distance?.text || "N/A"}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Service Information</CardTitle>
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
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{booking.location}</p>
                </div>
                <div className="pt-2">
                  <p className="font-medium">{isMechanic ? "Customer" : "Mechanic"} Details</p>
                  <p className="text-sm font-medium">{otherParty?.full_name || "N/A"}</p>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`tel:${otherParty?.phone}`, '_self')}
                    disabled={!otherParty?.phone}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call {isMechanic ? "Customer" : "Mechanic"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => navigate(`/chat/${bookingId}`)} // Navigate to chat route
                    disabled={!bookingId}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                </div>
                
                {isMechanic && showLiveRoute && (
                  <Button onClick={handleCompleteService} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                    Mark as Completed
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Map Column */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] overflow-hidden">
              <CardHeader>
                <CardTitle>Live Route Visualization</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full">
                {isMapScriptLoaded ? (
                  <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted/50">
                    <Loader2 className="h-8 w-8 animate-spin mr-3" />
                    <p>Loading map components...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
