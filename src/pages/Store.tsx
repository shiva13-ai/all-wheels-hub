import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Star, Wrench, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { storeService, Product } from "@/services/supabase/store"; 

const CART_STORAGE_KEY = "autoaid_cart";

interface CartItem extends Product {
    quantity: number;
}

export default function Store() {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [products, setProducts] = useState<Product[]>([]); 
  const [loading, setLoading] = useState(true);

  // Fetch products from Supabase and load cart on mount
  useEffect(() => {
      try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        }
      } catch (e) {
        console.error("Failed to load cart from local storage", e);
      }

      const fetchProducts = async () => {
          setLoading(true);
          const { data, error } = await storeService.getActiveProducts();
          if (error) {
              console.error("Supabase Error fetching products:", error);
              toast({
                  title: "Error",
                  description: "Failed to load store products.",
                  variant: "destructive"
              });
              setProducts([]); 
          } else {
              // storeService already converts price to major units.
              setProducts((data || []) as Product[]);
          }
          setLoading(false);
      };
      fetchProducts();
  }, [toast]);

  const handleAddToCart = (product: Product) => {
    let currentCart: CartItem[] = [];
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        currentCart = JSON.parse(storedCart);
      }
    } catch (e) {
      console.error("Failed to parse cart from local storage", e);
      currentCart = []; // Start with an empty cart if storage is corrupt
    }

    const existingItem = currentCart.find(item => item.id === product.id);
    
    let updatedCart: CartItem[];
    if (existingItem) {
        // Increase quantity if item is already in cart
        updatedCart = currentCart.map(item => 
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
    } else {
        // Add new item to cart
        updatedCart = [...currentCart, { ...product, quantity: 1 }];
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
    setCart(updatedCart);

    toast({
      title: "Added to Cart",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Passing the total cart count to the Header */}
      <Header cartItemCount={totalItems} /> 
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            AutoAid Store
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Shop quality parts from verified mechanics and stores.
          </p>
        </div>
        
        {/* Visible Cart Summary/Link (Shows up when items are added) */}
        {totalItems > 0 && (
            <Card className="max-w-md mx-auto mb-8 bg-primary/10 border-primary/20">
                <CardContent className="p-4 flex items-center justify-between">
                    <p className="text-lg font-semibold text-primary">
                        {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
                    </p>
                    {/* Placeholder route /cart should be implemented later */}
                    <Link to="/cart"> 
                        <Button size="sm" variant="default">
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            View Cart
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        )}
        
        {/* Loading State */}
        {loading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Fetching products...</span>
            </div>
        ) : products.length === 0 ? (
             <Card className="max-w-xl mx-auto">
                <CardContent className="py-12 text-center text-muted-foreground">
                   <Wrench className="w-12 h-12 mx-auto mb-4" />
                   <h3 className="font-semibold text-lg text-foreground">No Products Available</h3>
                   <p>It looks like no active products are currently listed by mechanics.</p>
                </CardContent>
             </Card>
        ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                    <Card key={product.id} className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <CardHeader className="p-0">
                        {/* Use real image URL or fallback to a placeholder */}
                        <img 
                            src={product.image_url || `https://placehold.co/600x400/e2e8f0/334155?text=${product.title?.replace(/\s/g, '+')}`} 
                            alt={product.title || 'Product'} 
                            className="w-full h-48 object-cover" 
                            onError={(e) => {
                                // Fallback image on error
                                const target = e.target as HTMLImageElement;
                                target.src = `https://placehold.co/600x400/e2e8f0/334155?text=${product.title?.replace(/\s/g, '+')}`;
                            }}
                        />
                      </CardHeader>
                      <CardContent className="p-4 flex-grow">
                        <CardTitle className="text-lg font-semibold mb-1">{product.title}</CardTitle>
                        {/* Display the mechanic's name if available (assuming mechanic object is populated by join) */}
                        {product.mechanic?.full_name && (
                            <CardDescription className="flex items-center text-primary/80">
                                <Wrench className="w-3 h-3 mr-1" />
                                Sold by: {product.mechanic.full_name}
                            </CardDescription>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        
                        {/* Generic Rating Display - You may replace with a real review count later */}
                         <div className="flex items-center mt-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">(150 reviews)</span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 flex justify-between items-center bg-muted/50">
                        {/* Display price in major unit */}
                        <p className="text-xl font-bold">₹{product.price.toFixed(2)}</p>
                        <Button onClick={() => handleAddToCart(product)} size="sm">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Add to Cart
                        </Button>
                      </CardFooter>
                    </Card>
                ))}
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
