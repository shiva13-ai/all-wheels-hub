import { useState } from "react";
import { VehicleServiceCard } from "./VehicleServiceCard";
import { BookingModal } from "./BookingModal";
import { Bike, Car, Truck, Zap } from "lucide-react";

export const ServicesSection = () => {
  const [selectedService, setSelectedService] = useState<{
    vehicleType: 'bicycle' | 'bike' | 'car' | 'truck';
    services: string[];
  } | null>(null);
  const vehicleServices = [
    {
      title: "Bicycle Services",
      icon: Bike,
      services: ["Puncture Repair", "Brake Fix", "Chain Repair", "Gear Adjustment"],
      emergencyAvailable: true,
    },
    {
      title: "Bike Services", 
      icon: Zap,
      services: ["Oil Change", "Tyre Replacement", "Engine Tuning", "Battery Service"],
      emergencyAvailable: true,
    },
    {
      title: "Auto Services",
      icon: Truck,
      services: ["Engine Repair", "Transmission", "AC Service", "Electrical Work"],
      emergencyAvailable: true,
    },
    {
      title: "Car Services",
      icon: Car,
      services: ["AC Service", "Towing", "Engine Diagnostics", "Brake Service"],
      emergencyAvailable: true,
    },
  ];

  return (
    <section id="services" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Choose Your Vehicle Type
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional services for all types of vehicles with certified mechanics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {vehicleServices.map((service, index) => (
            <VehicleServiceCard
              key={index}
              title={service.title}
              icon={service.icon}
              services={service.services}
              emergencyAvailable={service.emergencyAvailable}
              onClick={() => setSelectedService({
                vehicleType: service.title.toLowerCase().includes('bicycle') ? 'bicycle' :
                           service.title.toLowerCase().includes('bike') ? 'bike' :
                           service.title.toLowerCase().includes('car') ? 'car' : 'truck',
                services: service.services
              })}
            />
          ))}
        </div>
      </div>
      
      {selectedService && (
        <BookingModal
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          vehicleType={selectedService.vehicleType}
          services={selectedService.services}
        />
      )}
    </section>
  );
};