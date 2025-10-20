import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { useLocation, useNavigate } from 'react-router-dom';
import { Separator } from "../components/ui/separator";
import { PaymentModal } from "../components/PaymentModal";
import { useAuth } from "../contexts/AuthContext";
import { ordersService } from "../services/supabase/orders";
import { Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';

// Define the structure for an item in the cart
interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string;
}

const CART_STORAGE_KEY = "autoaid_cart";

const Checkout: React.FC = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    useEffect(() => {
        let cartData = location.state?.cart as CartItem[];

        if (!cartData || cartData.length === 0) {
            try {
                const storedCart = localStorage.getItem(CART_STORAGE_KEY);
                if (storedCart) {
                    cartData = JSON.parse(storedCart);
                }
            } catch (e) {
                console.error("Failed to load cart from local storage", e);
            }
        }
        
        if (cartData && cartData.length > 0) {
            setCart(cartData);
        }

        setLoading(false);
    }, [location.state]);


    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const taxRate = 0.05;
        const shipping = subtotal > 0 ? 10.00 : 0;
        const tax = subtotal * taxRate;
        return subtotal + tax + shipping;
    };

    const handlePaymentSuccess = async (paymentMethod: string) => {
        setPaymentModalOpen(false);
        setLoading(true);

        if (!user) {
            toast({ title: "Authentication Error", description: "You must be signed in to place an order.", variant: "destructive" });
            setLoading(false);
            return;
        }

        const orderData = {
            items: cart.map(item => ({ product_id: item.id, quantity: item.quantity, price: item.price * 100, title: item.title, image_url: item.image_url })),
            total_amount: calculateTotal(),
            status: 'paid' as 'paid',
            payment_method: paymentMethod,
        };

        try {
            const { error } = await ordersService.createOrder(orderData);
            if (error) throw error;

            localStorage.removeItem(CART_STORAGE_KEY); // Clear cart after successful order
            setCart([]);
            toast({
                title: "Order Placed Successfully!",
                description: "You can view your order in the 'My Orders' section.",
            });
            navigate('/orders');
        } catch (error: any) {
            toast({ title: "Order Failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    const subtotal = calculateSubtotal();
    const total = calculateTotal();


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background">
            <Header cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
            <main className="container mx-auto px-4 py-8 mt-20">
                 <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
                    <Button variant="link" onClick={() => navigate('/cart')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cart
                    </Button>
                </div>
                
                {cart.length === 0 ? (
                     <Card className="p-16 text-center shadow-lg">
                        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No Items to Checkout</h2>
                        <p className="text-muted-foreground mb-6">Your cart is empty. Let's find something for you.</p>
                        <Button onClick={() => navigate('/store')} variant="cta">
                            Go to Store
                        </Button>
                     </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Order Items */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <ShoppingBag className="h-5 w-5" />
                                        Order Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {cart.map(item => (
                                        <div key={item.id} className="flex items-center py-4 border-b last:border-b-0">
                                            <img
                                                src={item.image_url || `https://placehold.co/80x80/e2e8f0/334155?text=Product`}
                                                alt={item.title}
                                                className="w-16 h-16 object-cover rounded-md mr-4"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold">{item.title}</p>
                                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                            </div>
                                            <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        
                        {/* Summary */}
                        <div className="lg:col-span-1 h-fit">
                             <Card className="shadow-lg sticky top-24">
                                <CardHeader>
                                    <CardTitle className="text-xl">Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal</span>
                                            <span>₹{subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Shipping</span>
                                            <span>{subtotal > 0 ? '₹10.00' : '₹0.00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Tax (5%)</span>
                                            <span>₹{(subtotal * 0.05).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-xl font-bold text-foreground">
                                        <span>Total</span>
                                        <span>₹{total.toFixed(2)}</span>
                                    </div>
                                    <Button 
                                        variant="cta" 
                                        className="w-full text-lg h-12" 
                                        disabled={loading}
                                        onClick={() => setPaymentModalOpen(true)}
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Proceed to Payment'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
            
            <PaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onPaymentSuccess={handlePaymentSuccess}
                amount={total}
            />
        </div>
    )
}

export default Checkout;