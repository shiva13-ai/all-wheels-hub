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
  Clock
} from "lucide-react";

export const FeaturesSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: MapPin,
      title: "Location-Based Discovery",
      description: "Find nearby mechanics using GPS and Google Maps integration",
      color: "text-primary"
    },
    {
      icon: MessageCircle,
      title: "AI Chatbot Assistant",
      description: "24/7 troubleshooting, FAQs, and guided booking assistance",
      color: "text-accent"
    },
    {
      icon: ShoppingCart,
      title: "Online Accessories Store",
      description: "Shop from local stores with cart, checkout, and tracking",
      color: "text-primary"
    },
    {
      icon: Star,
      title: "Ratings & Reviews",
      description: "Transparent feedback system for mechanics and shops",
      color: "text-accent"
    },
    {
      icon: CreditCard,
      title: "Multiple Payment Options",
      description: "UPI, Stripe, PayPal integration for seamless transactions",
      color: "text-primary"
    },
    {
      icon: Phone,
      title: "In-App Communication",
      description: "Direct chat and call between users and service providers",
      color: "text-accent"
    },
    {
      icon: Shield,
      title: "Emergency SOS",
      description: "Instant emergency assistance with location sharing",
      color: "text-destructive"
    },
    {
      icon: Clock,
      title: "Service History",
      description: "Track all your services and purchases in one place",
      color: "text-primary"
    }
  ];

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
            const isInAppComm = feature.title === "In-App Communication";
            const handleClick = isInAppComm && user ? () => navigate('/chat') : undefined;
            
            return (
              <Card 
                key={index} 
                className={`hover:shadow-elegant transition-all duration-300 hover:scale-105 bg-card border-border group ${isInAppComm && user ? 'cursor-pointer' : ''}`}
                onClick={handleClick}
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