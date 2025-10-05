import { useState } from "react";
import { VehicleServiceCard } from "./VehicleServiceCard";
import { BookingModal } from "./BookingModal";
import { Bike, Car, Truck, Zap } from "lucide-react";

export const ServicesSection = () => {
  const [selectedService, setSelectedService] = useState<{
    vehicleType: 'bicycle' | 'bike' | 'car' | 'truck';
    services: Array<{ name: string; price: number }>;
  } | null>(null);
  const vehicleServices = [
    {
      title: "Bicycle Services",
      icon: Bike,
      services: [
        { name: "Puncture Repair", price: 50 },
        { name: "Brake Fix", price: 150 },
        { name: "Chain Repair", price: 100 },
        { name: "Gear Adjustment", price: 120 }
      ],
      emergencyAvailable: true,
    },
    {
      title: "Bike Services", 
      icon: Zap,
      services: [
        { name: "Oil Change", price: 300 },
        { name: "Tyre Replacement", price: 800 },
        { name: "Engine Tuning", price: 1500 },
        { name: "Battery Service", price: 500 }
      ],
      emergencyAvailable: true,
    },
    {
      title: "Auto Services",
      icon: Truck,
      services: [
        { name: "Engine Repair", price: 2500 },
        { name: "Transmission", price: 3500 },
        { name: "AC Service", price: 1200 },
        { name: "Electrical Work", price: 1000 }
      ],
      emergencyAvailable: true,
    },
    {
      title: "Car Services",
      icon: Car,
      services: [
        { name: "AC Service", price: 1500 },
        { name: "Towing", price: 800 },
        { name: "Engine Diagnostics", price: 1200 },
        { name: "Brake Service", price: 1800 }
      ],
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
              services={service.services.map(s => s.name)}
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