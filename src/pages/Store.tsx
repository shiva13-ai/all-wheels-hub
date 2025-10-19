import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Star } from "lucide-react";

// Mock data for the store products
const products = [
  {
    id: 'prod_001',
    name: 'Synthetic Engine Oil',
    description: '5W-30, 5 Quart - For peak engine performance.',
    price: 34.99,
    rating: 4.5,
    reviewCount: 120,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Engine+Oil'
  },
  {
    id: 'prod_002',
    name: 'Ceramic Brake Pads',
    description: 'Front set - Low dust, quiet operation.',
    price: 55.75,
    rating: 4.8,
    reviewCount: 98,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Brake+Pads'
  },
  {
    id: 'prod_003',
    name: 'All-Season Tires',
    description: '225/60R16 - Reliable traction in all conditions.',
    price: 120.00,
    rating: 4.6,
    reviewCount: 215,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Tire'
  },
  {
    id: 'prod_004',
    name: 'Car Battery',
    description: 'Group 24F, 750 CCA - Long-lasting power.',
    price: 150.50,
    rating: 4.7,
    reviewCount: 150,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Battery'
  },
    {
    id: 'prod_005',
    name: 'Wiper Blades (Set of 2)',
    description: '22-inch & 20-inch - Streak-free visibility.',
    price: 22.99,
    rating: 4.4,
    reviewCount: 300,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Wiper+Blades'
  },
  {
    id: 'prod_006',
    name: 'Cabin Air Filter',
    description: 'Removes dust and pollen for cleaner air.',
    price: 18.25,
    rating: 4.9,
    reviewCount: 450,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Air+Filter'
  },
    {
    id: 'prod_007',
    name: 'Headlight Restoration Kit',
    description: 'Removes cloudiness and restores clarity.',
    price: 19.99,
    rating: 4.3,
    reviewCount: 88,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Headlight+Kit'
  },
  {
    id: 'prod_008',
    name: 'Portable Tire Inflator',
    description: '12V DC - Digital pressure gauge and auto-shutoff.',
    price: 39.95,
    rating: 4.8,
    reviewCount: 189,
    image: 'https://placehold.co/600x400/e2e8f0/334155?text=Tire+Inflator'
  },
];

export default function Store() {
  const { toast } = useToast();

  const handleAddToCart = (productName: string) => {
    toast({
      title: "Added to Cart",
      description: `${productName} has been added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            AutoAid Store
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your one-stop shop for quality car parts and accessories.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="p-0">
                <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <CardTitle className="text-lg font-semibold mb-1">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{product.description}</p>
                 <div className="flex items-center mt-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">({product.reviewCount} reviews)</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 flex justify-between items-center bg-slate-50">
                <p className="text-xl font-bold">${product.price.toFixed(2)}</p>
                <Button onClick={() => handleAddToCart(product.name)} size="sm">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

