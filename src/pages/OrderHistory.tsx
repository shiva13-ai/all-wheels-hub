import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Loader2, ShoppingBag } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { ordersService, Order } from "../services/supabase/orders";

const OrderHistory: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || authLoading) return;

        const fetchOrders = async () => {
            setLoading(true);
            try {
                const { data, error } = await ordersService.getUserOrders(user.id);
                if (error) throw error;
                setOrders(data || []);
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: "Failed to load order history.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user, authLoading, toast]);

    const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'paid': return 'default';
            case 'shipped': return 'secondary';
            case 'delivered': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8 mt-20">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">My Orders</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        A history of all your purchases from the AutoAid store.
                    </p>
                </div>

                {orders.length === 0 ? (
                    <Card className="p-16 text-center shadow-lg">
                        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No Orders Found</h2>
                        <p className="text-muted-foreground">You haven't placed any orders yet.</p>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <Card key={order.id}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Order #{order.id.substring(0, 8)}</CardTitle>
                                        <CardDescription>Placed on {new Date(order.created_at).toLocaleDateString()}</CardDescription>
                                    </div>
                                    <Badge variant={getStatusVariant(order.status)} className="capitalize">{order.status}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {(order.items as any[]).map((item: any) => (
                                            <div key={item.product_id} className="flex items-center">
                                                <img 
                                                    src={item.image_url || `https://placehold.co/64x64/e2e8f0/334155?text=Item`}
                                                    alt={item.title}
                                                    className="w-16 h-16 object-cover rounded-md mr-4"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold">{item.title}</p>
                                                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                                </div>
                                                <p className="font-semibold">₹{(item.price / 100 * item.quantity).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right mt-4 font-bold text-lg">
                                        Total: ₹{(order.total_amount).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default OrderHistory;

