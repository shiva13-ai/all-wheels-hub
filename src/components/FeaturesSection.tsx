import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MapPin, 
  MessageCircle, 
  ShoppingCart, 
  Star, 
  CreditCard, 
  Phone,
  Shield,
  Clock, // Clock is used for Service History
  History // ADDED: For Service History Icon (optional, depending on Lucide icon usage)
} from "lucide-react";

export const FeaturesSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: MapPin,
      title: "Location-Based Discovery",
      description: "Find nearby mechanics using GPS and Google Maps integration",
      color: "text-primary",
      route: '', // No specific route
    },
    {
      icon: MessageCircle,
      title: "AI Chatbot Assistant",
      description: "24/7 troubleshooting, FAQs, and guided booking assistance",
      color: "text-accent",
      route: '/chat' // Link to chat interface
    },
    {
      icon: ShoppingCart,
      title: "Online Accessories Store",
      description: "Shop from local stores with cart, checkout, and tracking",
      color: "text-primary",
      route: '/store' // Link to store
    },
    {
      icon: Star,
      title: "Ratings & Reviews",
      description: "Transparent feedback system for mechanics and shops",
      color: "text-accent",
      route: '', // No specific route
    },
    {
      icon: CreditCard,
      title: "Multiple Payment Options",
      description: "UPI, Stripe, PayPal integration for seamless transactions",
      color: "text-primary",
      route: '', // No specific route
    },
    {
      icon: Phone, // Assuming Phone/MessageCircle can cover this, but we'll stick to the existing data structure
      title: "In-App Communication",
      description: "Direct chat and call between users and service providers",
      color: "text-accent",
      route: '/chat' // Link to chat interface
    },
    {
      icon: Shield,
      title: "Emergency SOS",
      description: "Instant emergency assistance with location sharing",
      color: "text-destructive",
      route: '/emergency' // Link to emergency features
    },
    {
      icon: Clock, // Keeping original Clock icon for consistency with your existing code
      title: "Service History",
      description: "Track all your services and purchases in one place",
      color: "text-primary",
      route: '/history' // NEW: Link to Service History page
    }
  ];

  const handleFeatureClick = (route: string) => {
      if (!route) return;
      if (!user) {
          // You might want a better UX here, but for now, redirect to auth
          navigate('/auth');
      } else {
          navigate(route);
      }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Powerful Features for Modern Vehicle Care
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to maintain your vehicles, connect with trusted mechanics, 
            and shop for accessories - all in one comprehensive platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => {
            const hasRoute = !!feature.route;
            
            return (
              <Card 
                key={index} 
                className={`hover:shadow-elegant transition-all duration-300 hover:scale-105 bg-card border-border group ${hasRoute ? 'cursor-pointer' : ''}`}
                onClick={() => hasRoute && handleFeatureClick(feature.route)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all duration-300">
                    <feature.icon className={`w-6 h-6 ${feature.color} group-hover:text-primary-foreground`} />
                  </div>
                  <CardTitle className="text-lg font-semibold text-card-foreground">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button variant="cta" size="lg" className="text-lg px-8 py-6">
            Get Started Today
          </Button>
        </div>
      </div>
    </section>
  );
};
