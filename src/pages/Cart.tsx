import React, { useEffect, useState, useCallback } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { ShoppingCart, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";

// Define the structure for an item in the cart
interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string;
}

// Key used to store cart data in localStorage
const CART_STORAGE_KEY = "autoaid_cart";

const Cart: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load cart data from localStorage on initial render
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (e) {
      console.error("Failed to load cart from local storage", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to save cart changes to localStorage whenever the cart state updates
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, loading]);

  const updateQuantity = useCallback((id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: "Item Removed",
        description: "Product removed from cart.",
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  }, [toast]);

  const handleRemoveItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    toast({
      title: "Item Removed",
      description: "Product removed from cart.",
    });
  }, [toast]);

  const handleClearCart = useCallback(() => {
    setCart([]);
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart.",
    });
  }, [toast]);

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = subtotal > 0 ? 10.00 : 0;
    const tax = subtotal * 0.05;
    
    return subtotal + tax + shipping;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemCount={totalItems} />
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Your Shopping Cart</h1>
            <Button variant="link" onClick={() => navigate('/store')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping
            </Button>
        </div>

        {cart.length === 0 ? (
          <Card className="p-16 text-center shadow-lg">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't added any products yet.
            </p>
            <Button onClick={() => navigate('/store')} variant="cta">
              Go to Store
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List - Col 1 & 2 */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <Card key={item.id} className="flex p-4 items-center">
                  <img
                    src={item.image_url || `https://placehold.co/80x80/e2e8f0/334155?text=Product`}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-md mr-4"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">₹{item.price.toFixed(2)} / unit</p>
                    <p className="text-lg font-bold text-primary">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                      className="w-20 h-10 text-center"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <div className="flex justify-between p-4">
                <Button variant="outline" onClick={handleClearCart}>
                    Clear Cart
                </Button>
              </div>
            </div>

            {/* Order Summary - Col 3 */}
            <Card className="lg:col-span-1 h-fit shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping</span>
                    <span>₹{subtotal > 0 ? '10.00' : '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax (5%)</span>
                    <span>₹{(subtotal * 0.05).toFixed(2)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-xl font-bold text-foreground">
                  <span>Order Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                
                <Button variant="cta" className="w-full text-lg h-12" onClick={() => navigate('/checkout', { state: { cart } })} disabled={subtotal === 0}>
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;

