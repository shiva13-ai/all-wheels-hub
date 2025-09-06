import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface VehicleServiceCardProps {
  title: string;
  icon: LucideIcon;
  services: string[];
  emergencyAvailable?: boolean;
  onClick: () => void;
}

export const VehicleServiceCard = ({ 
  title, 
  icon: Icon, 
  services, 
  emergencyAvailable = false, 
  onClick 
}: VehicleServiceCardProps) => {
  return (
    <Card className="hover:shadow-elegant transition-all duration-300 hover:scale-105 bg-card border-border group">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4 group-hover:animate-float">
          <Icon className="w-8 h-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-xl font-bold text-card-foreground">{title}</CardTitle>
        {emergencyAvailable && (
          <Badge variant="destructive" className="mx-auto w-fit">
            Emergency Available
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {services.slice(0, 4).map((service, index) => (
            <div
              key={index}
              className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 text-center"
            >
              {service}
            </div>
          ))}
        </div>
        <Button
          variant="service"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
          onClick={onClick}
        >
          View Services
        </Button>
      </CardContent>
    </Card>
  );
};