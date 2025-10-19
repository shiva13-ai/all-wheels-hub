import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Eye, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { bookingsService } from "@/services/supabase/bookings";

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
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchActiveBookings();
    const subscription = subscribeToBookings();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user]);

  const fetchActiveBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          profiles:mechanic_id (full_name, phone)
        `
        )
        .eq("user_id", user?.id)
        .in("status", ["pending", "accepted", "confirmed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((booking: any) => ({
        ...booking,
        profiles: Array.isArray(booking.profiles)
          ? booking.profiles[0]
          : booking.profiles,
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

    return channel;
  };

  const handleCancelBooking = async () => {
    if (!cancellingBookingId) return;

    try {
      const { error } = await bookingsService.updateBookingStatus(
        cancellingBookingId,
        "cancelled"
      );

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "Your service request has been successfully cancelled.",
      });
      fetchActiveBookings(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error Cancelling",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancellingBookingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "accepted":
      case "confirmed":
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
      case "confirmed":
        return "Mechanic on the way";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading your bookings...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return null;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Your Active Requests</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{booking.service_type}</span>
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
                    <p className="text-sm text-muted-foreground">
                      {booking.location}
                    </p>
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

                {(booking.status === "accepted" || booking.status === "confirmed") && booking.profiles && (
                  <div>
                    <p className="font-medium">Mechanic</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.profiles.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.profiles.phone}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {(booking.status === "accepted" || booking.status === "confirmed") && (
                    <Button
                      onClick={() => navigate(`/tracking/${booking.id}`)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Track Live
                    </Button>
                  )}
                  {(booking.status === "pending" || booking.status === "accepted" || booking.status === "confirmed") && (
                     <Button
                        variant="outline"
                        onClick={() => setCancellingBookingId(booking.id)}
                        className="w-full"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <AlertDialog
        open={!!cancellingBookingId}
        onOpenChange={(open) => !open && setCancellingBookingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel your service request. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

