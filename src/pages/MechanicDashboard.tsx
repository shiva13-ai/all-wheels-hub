import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Header } from '../components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { MapPin, Clock, Car, CheckCircle, XCircle, Eye, History, Loader2, Wrench, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getDistance } from '../lib/utils';

// Ensure access to environment variable is handled correctly
const getGoogleMapsApiKey = () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const NEARBY_RADIUS_KM = 50; // 50km radius for nearby requests

// --- Custom Hook to load Google Maps Script ---
const useGoogleMapsScript = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Quick check if it's already loaded
    if (window.google && window.google.maps) {
        setIsLoaded(true);
        return;
    }
    
    if (!apiKey) {
      setError(new Error('Google Maps API key is missing.'));
      console.error('Google Maps API key is missing.');
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script-dashboard';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`; 
    script.async = true;
    script.defer = true;
    
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError(new Error("Google Maps script failed to load."));

    document.head.appendChild(script);
  }, [apiKey]);

  return { isLoaded, error };
};

// --- Booking Interface ---
interface Booking {
  id: string;
  user_id: string;
  service_type: string;
  vehicle_type: string;
  location: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  mechanic_latitude: number | null;
  mechanic_longitude: number | null;
  created_at: string;
  status: string;
  is_late_night_alert: boolean; // Flag for safety feature
  customer_profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

// Define the core booking selection fields explicitly to avoid generic schema mismatch errors
const BOOKING_SELECT_FIELDS = `
    id, user_id, service_type, vehicle_type, location, description, 
    latitude, longitude, mechanic_latitude, mechanic_longitude, 
    mechanic_last_location_update, created_at, status, is_late_night_alert
`;

// --- Mechanic Dashboard Component ---
const MechanicDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [filteredPendingRequests, setFilteredPendingRequests] = useState<Booking[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mechanicLocation, setMechanicLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Track Map Load Errors Separately
  const { isLoaded: isMapLoaded, error: mapLoadError } = useGoogleMapsScript(getGoogleMapsApiKey());

  // Map state management
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  // 1. Initial Load & Auth Check
  useEffect(() => {
    // If Auth is still loading, do nothing
    if (authLoading) return;
    
    // Unauthorized Access Check
    if (!user || profile?.role !== "mechanic") {
        setLoading(false); 
        return;
    }
    
    // --- LOCATION FIX: FORCE PROFILE LOCATION FOR FILTERING ---
    let finalLocation = { lat: 17.385, lng: 78.4867 }; // Default fallback (Hyderabad)
    let profileLocationUsed = false;
    
    if (profile?.latitude && profile?.longitude) {
        // PRIORITY 1 (SYNC): Use the coordinates saved in the profile (The canonical shop location)
        finalLocation = {
            lat: profile.latitude,
            lng: profile.longitude,
        };
        setMechanicLocation(finalLocation);
        console.log("Dashboard using SAVED Profile Location (Canonical):", finalLocation.lat, finalLocation.lng);
        profileLocationUsed = true;
    } 
    
    // PRIORITY 2 (ASYNC): Only fall back to browser location if profile coordinates are MISSING
    // NOTE: This block is primarily for initial setup/onboarding if shop location is missing.
    // We run it if profileLocationUsed is false.
    if (!profileLocationUsed && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
              setMechanicLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
              console.log("Dashboard using Browser Geolocation Fallback:", position.coords.latitude, position.coords.longitude);
            },
            (error) => {
              console.error("Error getting current location: ", error);
              // Final fallback to hardcoded default (already initialized in finalLocation)
              setMechanicLocation(finalLocation); 
            }
        );
    } else if (!profileLocationUsed) {
         // PRIORITY 3: Use hardcoded default if geolocation is not available/supported
        setMechanicLocation(finalLocation);
    }
    // --- LOCATION FIX END ---


    fetchDashboardData();
    const subscription = subscribeToRequests();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      // Cleanup map markers if they exist
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, [user, profile, authLoading]); // profile is included as a dependency to react to updates


  // 2. Filter Logic (runs whenever requests or mechanicLocation changes)
  useEffect(() => {
    if (mechanicLocation && pendingRequests.length > 0) {
      const nearby = pendingRequests.filter(request => {
        // Must have valid coordinates to filter by distance
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
      }).sort((a, b) => {
        // Sort by distance ascending
        const distA = getDistance(mechanicLocation.lat, mechanicLocation.lng, a.latitude!, a.longitude!);
        const distB = getDistance(mechanicLocation.lat, mechanicLocation.lng, b.latitude!, b.longitude!);
        return distA - distB;
      });
      
      setFilteredPendingRequests(nearby);
    } else {
      // If location is null or no requests, set to empty or all (depending on UX preference)
      // Showing all pending if location isn't set can be confusing, so showing none is safer.
      setFilteredPendingRequests([]); 
    }
  }, [pendingRequests, mechanicLocation]);


  // 3. Map Initialization and Marker Update
  useEffect(() => {
    // Only attempt to initialize if Map is loaded and there are no immediate load errors
    if (!isMapLoaded || !mapElementRef.current || mapLoadError) return;

    // Use mechanic's actual determined location for map centering
    const initialCenter = mechanicLocation || { lat: 17.385, lng: 78.4867 }; 
    
    // Initialize map if it hasn't been done yet
    const map = mapRef.current || new window.google.maps.Map(mapElementRef.current, {
        center: initialCenter,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
    });
    
    if (!mapRef.current) {
        mapRef.current = map;
    }

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    
    // Add markers for filtered requests
    filteredPendingRequests
      .filter(r => r.latitude && r.longitude)
      .forEach(request => {
        const position = { lat: request.latitude!, lng: request.longitude! };
        
        // Use different icon for late night alerts
        const iconUrl = request.is_late_night_alert
            ? 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' // Attention color
            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
            
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: `${request.service_type} - ${request.customer_profile?.full_name}`,
          icon: iconUrl,
        });
        
        const infoWindow = new window.google.maps.InfoWindow({
            content: `
                <div class="p-1 font-sans">
                    <h5 class="font-semibold text-base mb-1">${request.service_type}</h5>
                    <p class="text-sm">Customer: ${request.customer_profile?.full_name || 'N/A'}</p>
                    <p class="text-xs text-muted-foreground">${request.location}</p>
                    ${request.is_late_night_alert ? '<p class="text-xs text-red-500 font-bold mt-1">SAFETY ALERT (Late Night)</p>' : ''}
                    <a href="/tracking/${request.id}" class="text-primary text-xs mt-2 block hover:underline">View Tracking</a>
                </div>
            `
        });
        
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
        bounds.extend(position);
        hasPoints = true;
      });
      
    // Add mechanic marker
    if (mechanicLocation) {
        const position = { lat: mechanicLocation.lat, lng: mechanicLocation.lng };
        const mechanicMarker = new window.google.maps.Marker({
            position,
            map,
            title: "Your Location",
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        });
        markersRef.current.push(mechanicMarker);
        bounds.extend(position);
        hasPoints = true;
    }


    // Fit map to markers or center on mechanic
    if (hasPoints) {
      if (markersRef.current.length > 1) {
          map.fitBounds(bounds);
      } else {
          // Single point or only mechanic marker, keep a reasonable zoom
          map.setCenter(bounds.getCenter());
          map.setZoom(12);
      }
    } else if (mechanicLocation) {
        map.setCenter(mechanicLocation);
    }
    
  }, [isMapLoaded, filteredPendingRequests, mechanicLocation, mapLoadError]);


  // 4. Data Fetching
  const fetchDashboardData = async () => {
    try {
      // Fetch all pending requests for filtering - Use explicit selection
      const { data: pendingData, error: pendingError } = await supabase
        .from("bookings")
        .select(`
            ${BOOKING_SELECT_FIELDS}, 
            customer_profile:profiles!user_id(full_name, phone)
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
        // Accepted/In-Progress - Use explicit selection
        const { data: acceptedData } = await supabase
          .from("bookings")
          .select(`
            ${BOOKING_SELECT_FIELDS}, 
            customer_profile:profiles!user_id(full_name, phone)
          `)
          .eq("mechanic_id", user.id)
          .in("status", ["confirmed", "in_progress"])
          .order("created_at", { ascending: false });

        const transformedAccepted = (acceptedData || []).map((booking: any) => ({
          ...booking,
          customer_profile: Array.isArray(booking.customer_profile) ? booking.customer_profile[0] : booking.customer_profile
        }));
        setAcceptedBookings(transformedAccepted as Booking[]);

        // Past (completed/cancelled) - Use explicit selection
        const { data: pastData } = await supabase
          .from("bookings")
          .select(`
            ${BOOKING_SELECT_FIELDS}, 
            customer_profile:profiles!user_id(full_name, phone)
          `)
          .eq("mechanic_id", user.id)
          .in("status", ["completed", "cancelled", "rejected"])
          .order("created_at", { ascending: false });
        
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

  // 5. Subscription to Realtime Changes 
  const subscribeToRequests = () => {
    const channel = supabase
      .channel("mechanic-dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return channel;
  };

  // 6. Action Handlers 
  const handleAcceptRequest = async (bookingId: string) => {
      // NOTE: This logic relies on browser geolocation which can be slow or inaccurate.
      // If the profile coordinates are required, ensure they are passed here.
      
      if (!("geolocation" in navigator)) {
       toast({
         title: "Geolocation Not Supported",
         description: "Your browser does not support location services, which are required to accept requests.",
         variant: "destructive",
       });
       return;
     }

     setLoading(true);

     navigator.geolocation.getCurrentPosition(
       async (position) => {
         try {
           const mechanicId = user?.id; // Must be present
           if (!mechanicId) throw new Error("User not authenticated.");

           // The current device location is used for the mechanic's starting location
           const { error } = await supabase
             .from("bookings")
             .update({
               mechanic_id: mechanicId,
               status: "confirmed", 
               mechanic_latitude: position.coords.latitude,
               mechanic_longitude: position.coords.longitude,
               mechanic_last_location_update: new Date().toISOString(),
             })
             .eq("id", bookingId);

           if (error) throw error;

           toast({
             title: "Request Accepted",
             description: "You can now track the customer's location on the live map.",
           });

           navigate(`/tracking/${bookingId}`);
         } catch (error: any) {
           // Handle the persistent net.http_post error by guiding the user to the database fix.
           if (error.message.includes('function net.http_post')) {
             toast({ 
               title: "DATABASE ERROR: Networking Failed", 
               description: "The request ACCEPTED, but a backend database trigger (likely for an alert) failed because the **pg_net extension** is not enabled in Supabase.", 
               variant: "destructive" 
             });
             // Even if the trigger failed, the core status change likely succeeded.
             // We navigate anyway to unblock the mechanic.
             navigate(`/tracking/${bookingId}`); 

           } else {
             toast({ title: "Error Accepting Request", description: error.message, variant: "destructive" });
           }
         } finally {
           setLoading(false);
         }
       },
       (error) => {
         toast({ title: "Location Error", description: "Please enable location services to accept requests. " + error.message, variant: "destructive" });
         setLoading(false);
       }
     );
   };

  const handleRejectRequest = async (bookingId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "rejected" })
        .eq("id", bookingId)
        .eq("status", "pending"); 

      if (error) throw error;

      toast({ title: "Request Rejected", description: "The request has been removed from your dashboard." });
      setPendingRequests(prevRequests => prevRequests.filter(req => req.id !== bookingId));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'completed': return 'default';
        case 'cancelled': return 'secondary';
        case 'rejected': return 'destructive';
        case 'confirmed':
        case 'in_progress':
          return 'default';
        default: return 'outline';
    }
  }

  // --- Render Logic ---
  
  // 1. Initial Loading State
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-3 text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  // 2. Access Denied (Non-Mechanic)
  if (profile?.role !== "mechanic") {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto px-4 py-20 mt-10 max-w-xl">
                <Card className="border-destructive/50 shadow-lg">
                    <CardHeader className="text-center">
                        <Wrench className="h-12 w-12 text-destructive mx-auto mb-3" />
                        <CardTitle className="text-2xl">Access Restricted</CardTitle>
                        <CardContent>
                          <p className="text-muted-foreground mt-2">
                              You must be registered and verified as a mechanic to access this dashboard.
                          </p>
                          <Button onClick={() => navigate('/profile')} className="mt-4">
                              View Profile Status
                          </Button>
                        </CardContent>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-20 space-y-12">
        
        {/* Tabs for Active Jobs and History */}
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Jobs ({acceptedBookings.length})</TabsTrigger>
            <TabsTrigger value="history">Job History ({pastBookings.length})</TabsTrigger>
          </TabsList>
          
          {/* Active Jobs Content */}
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
                  <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                            {booking.service_type}
                            {booking.is_late_night_alert && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 fill-white" />
                                    SAFETY ALERT
                                </Badge>
                            )}
                        </span>
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
                          <p className="text-sm text-muted-foreground">{booking.customer_profile?.phone}</p>
                        </div>
                      </div>
                      <Button onClick={() => navigate(`/tracking/${booking.id}`)} className="w-full mt-2">
                        <Eye className="h-4 w-4 mr-2" />
                        Track Live
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Job History Content */}
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
                  <Card key={booking.id} className="opacity-70">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                            {booking.service_type}
                             {booking.is_late_night_alert && (
                                 <Badge variant="destructive" className="flex items-center gap-1">
                                     <AlertTriangle className="h-3 w-3 fill-white" />
                                     SAFETY ALERT
                                 </Badge>
                             )}
                        </span>
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
        
        {/* Section for Nearby Pending Requests & Map */}
        <div>
          <h1 className="text-3xl font-bold mb-6">Nearby Service Requests ({filteredPendingRequests.length})</h1>
          {mechanicLocation && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing requests within **{NEARBY_RADIUS_KM}km** of your location: {mechanicLocation.lat.toFixed(4)}, {mechanicLocation.lng.toFixed(4)}
            </p>
          )}

          {filteredPendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {mechanicLocation
                    ? "No nearby pending requests at the moment."
                    : "Please wait while we locate you to show nearby requests..."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Request List (Column 1) */}
              <div className="space-y-4">
                {filteredPendingRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                            {request.service_type} - {request.vehicle_type}
                            {request.is_late_night_alert && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 fill-white" />
                                    SAFETY ALERT
                                </Badge>
                            )}
                        </span>
                        <Badge variant="secondary">Pending</Badge>
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
                          disabled={loading}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleRejectRequest(request.id)}
                          variant="outline"
                          className="flex-1"
                          disabled={loading}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Map View (Column 2) */}
              <div className="lg:sticky lg:top-24 h-[600px] border border-border rounded-lg overflow-hidden shadow-lg">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Nearby Request Locations Map
                        {mapLoadError && <AlertTriangle className="h-5 w-5 text-destructive" title="Map Error" />}
                    </CardTitle>
                    <CardDescription>Pins show nearby requests; Blue pin is your location.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!isMapLoaded || mapLoadError ? (
                        <div className="flex flex-col items-center justify-center h-[520px] bg-muted/50 p-4 text-center">
                            {mapLoadError ? (
                                <p className="text-destructive font-medium mb-2">Error loading map: Check API Key/Network.</p>
                            ) : (
                                <>
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <span className="mt-3">Loading Map...</span>
                                </>
                            )}
                        </div>
                    ) : (
                        <div ref={mapElementRef} style={{ width: "100%", height: "520px" }} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicDashboard;
