import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { MechanicsDiscovery } from "@/components/MechanicsDiscovery";
import { ServicesSection } from "@/components/ServicesSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";
import { SOSButton } from "@/components/SOSButton";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <MechanicsDiscovery />
      <ServicesSection />
      <FeaturesSection />
      <Footer />
      <SOSButton />
    </div>
  );
};

export default Index;
