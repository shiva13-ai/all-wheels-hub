import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingsService, Booking } from "@/services/supabase/bookings";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Car, CheckCircle, XCircle, Loader2, History } from "lucide-react"; // ADDED History import
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// Utility to determine badge variant based on status
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'completed': return 'default';
        case 'confirmed':
        case 'in_progress':
          return 'secondary';
        case 'cancelled':
        case 'rejected':
          return 'destructive';
        default: return 'outline';
    }
}

// Interface for bookings including mechanic info
interface UserBooking extends Booking {
    mechanic: { full_name: string | null; phone: string | null; rating: number; }[] | null;
}

const ServiceHistory: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [bookings, setBookings] = useState<UserBooking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || authLoading) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Fetch all bookings for the user
                const { data, error } = await bookingsService.getUserBookings(user.id);
                if (error) throw error;
                
                // Filter out pending and rejected bookings (they don't show up in history/active tabs here)
                const filteredData = (data || []).filter(
                    (b: any) => b.status !== 'pending' && b.status !== 'rejected'
                );

                setBookings(filteredData as UserBooking[]);
            } catch (error: any) {
                console.error("Error fetching service history:", error);
                toast({
                    title: "Error",
                    description: "Failed to load service history.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user, authLoading]);

    const activeJobs = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress');
    const pastJobs = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        return <div className="min-h-screen pt-32 text-center text-muted-foreground">Please sign in to view your service history.</div>
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto px-4 py-8 mt-20">
                <h1 className="text-3xl font-bold mb-8">My Service History</h1>

                {/* Active Jobs Section */}
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-primary">
                    <Clock className="h-5 w-5" /> Active Jobs ({activeJobs.length})
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
                    {activeJobs.length > 0 ? (
                        activeJobs.map(booking => (
                            <Card key={booking.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-lg">
                                        {booking.service_type}
                                        <Badge variant={getStatusBadgeVariant(booking.status)} className="capitalize">
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        <Car className="inline-block h-4 w-4 mr-1" /> {booking.vehicle_type}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4 mr-2" /> {booking.location}
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4 mr-2" /> {new Date(booking.created_at).toLocaleDateString()}
                                    </div>
                                    {booking.mechanic && booking.mechanic.length > 0 && (
                                        <div className="text-sm">
                                            <p className="font-medium">Mechanic:</p>
                                            <p className="text-muted-foreground">{booking.mechanic[0]?.full_name || 'Assigned Mechanic'}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="md:col-span-3">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                You currently have no jobs marked as confirmed or in progress.
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Separator className="my-10" />

                {/* Past Jobs Section */}
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-foreground/80">
                    <History className="h-5 w-5" /> Past Services ({pastJobs.length})
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pastJobs.length > 0 ? (
                        pastJobs.map(booking => (
                            <Card key={booking.id} className="opacity-80">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-lg">
                                        {booking.service_type}
                                        <Badge variant={getStatusBadgeVariant(booking.status)} className="capitalize">
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        <Car className="inline-block h-4 w-4 mr-1" /> {booking.vehicle_type}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4 mr-2" /> {booking.location}
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4 mr-2" /> Completed on {new Date(booking.updated_at).toLocaleDateString()}
                                    </div>
                                    {booking.mechanic && booking.mechanic.length > 0 && (
                                        <div className="text-sm">
                                            <p className="font-medium">Mechanic:</p>
                                            <p className="text-muted-foreground">{booking.mechanic[0]?.full_name || 'Mechanic'}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="md:col-span-3">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                You have no completed or cancelled service records yet.
                            </CardContent>
                        </Card>
                    )}
                </div>

            </div>
            <Footer />
        </div>
    );
};

export default ServiceHistory;
