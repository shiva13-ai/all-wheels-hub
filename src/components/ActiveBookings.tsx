import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveBooking {
  id: string;
  service_type: string;
  vehicle_type: string;
  location: string;
  status: string;
  created_at: string;
  mechanic_id: string | null;
  profiles: {
    full_name: string;
    phone: string;
  } | null;
}

export const ActiveBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<ActiveBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchActiveBookings();
    subscribeToBookings();
  }, [user]);

  const fetchActiveBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          profiles:mechanic_id (full_name, phone)
        `)
        .eq("user_id", user?.id)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data
      const transformedData = (data || []).map((booking: any) => ({
        ...booking,
        profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles
      }));
      
      setBookings(transformedData);
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

  const subscribeToBookings = () => {
    const channel = supabase
      .channel("user-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchActiveBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "accepted":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Waiting for mechanic";
      case "accepted":
        return "Mechanic on the way";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <p className="text-muted-foreground">Loading your bookings...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Your Active Requests</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">
                  {booking.service_type}
                </span>
                <Badge className={getStatusColor(booking.status)}>
                  {getStatusText(booking.status)}
                </Badge>
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
                  <p className="font-medium">Requested</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {booking.status === "accepted" && booking.profiles && (
                <div>
                  <p className="font-medium">Mechanic</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.profiles.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{booking.profiles.phone}</p>
                </div>
              )}

              {booking.status === "accepted" && (
                <Button
                  onClick={() => navigate(`/tracking/${booking.id}`)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Track Live
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
