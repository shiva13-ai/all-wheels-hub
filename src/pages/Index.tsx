import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";
import { SOSButton } from "@/components/SOSButton";
import { ActiveBookings } from "@/components/ActiveBookings";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading application...</div>;
  }
  
  // Note: The MechanicsDiscovery logic has been moved to the dedicated /find-mechanics route. 
  // The Index page will now focus on the main landing content.

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      {/* Active Bookings section, visible only to logged-in users */}
      <div id="active-bookings-section">
        {user && <ActiveBookings />}
      </div>
      
      {/* This section directs users to the dedicated discovery page */}
      <ServicesSection />
      <FeaturesSection />
      
      <Footer />
      {/* SOS Button is a persistent overlay */}
      <SOSButton />
    </div>
  );
};

export default Index;
