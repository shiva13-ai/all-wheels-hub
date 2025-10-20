import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Shield, Star } from "lucide-react";
// FIX: Using a publicly accessible placeholder URL instead of a local asset path for compatibility.
const heroImage = "https://placehold.co/1920x1080/0f172a/94a3b8?text=Vehicle+Service+Hub"; 
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();

  const handleBookServiceClick = () => {
    navigate('/find-mechanics');
  }

  const handleSOSClick = () => {
    // Navigate to a section or trigger the modal/page. For now, we link to the anchor.
    // The SOSModal will open automatically via SOSButton in Index.tsx
    navigate('/emergency'); 
  }

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Multi-vehicle service"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/95"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Your <span className="bg-gradient-hero bg-clip-text text-transparent">One-Stop</span> Solution
              <br />
              for All Vehicle Services
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From bicycles to cars, find trusted mechanics, emergency services, and accessories 
              all in one place. Available 24/7 with instant booking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="cta" 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={handleBookServiceClick}
            >
              Book Service Now
            </Button>
            <Button 
              variant="hero" 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={handleSOSClick}
            >
              Emergency SOS
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            <Card className="p-6 bg-card/80 backdrop-blur border-border hover:shadow-elegant transition-all duration-300">
              <div className="text-center space-y-2">
                <MapPin className="w-8 h-8 text-primary mx-auto" />
                <div className="text-2xl font-bold text-card-foreground">500+</div>
                <div className="text-sm text-muted-foreground">Mechanics</div>
              </div>
            </Card>
            
            <Card className="p-6 bg-card/80 backdrop-blur border-border hover:shadow-elegant transition-all duration-300">
              <div className="text-center space-y-2">
                <Clock className="w-8 h-8 text-accent mx-auto" />
                <div className="text-2xl font-bold text-card-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </Card>
            
            <Card className="p-6 bg-card/80 backdrop-blur border-border hover:shadow-elegant transition-all duration-300">
              <div className="text-center space-y-2">
                <Shield className="w-8 h-8 text-primary mx-auto" />
                <div className="text-2xl font-bold text-card-foreground">100%</div>
                <div className="text-sm text-muted-foreground">Verified</div>
              </div>
            </Card>
            
            <Card className="p-6 bg-card/80 backdrop-blur border-border hover:shadow-elegant transition-all duration-300">
              <div className="text-center space-y-2">
                <Star className="w-8 h-8 text-accent mx-auto" />
                <div className="text-2xl font-bold text-card-foreground">4.9</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
