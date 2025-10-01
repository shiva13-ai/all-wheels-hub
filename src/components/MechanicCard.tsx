import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Star, Wrench, Shield, Phone } from "lucide-react";
import { UserProfile } from "@/services/supabase/profiles";

interface MechanicCardProps {
  mechanic: UserProfile;
  onBookService: (mechanicId: string) => void;
}

export const MechanicCard = ({ mechanic, onBookService }: MechanicCardProps) => {
  return (
    <Card className="p-6 hover:shadow-elegant transition-all duration-300 border-border">
      <div className="flex flex-col sm:flex-row gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={mechanic.avatar_url || undefined} alt={mechanic.full_name || "Mechanic"} />
          <AvatarFallback>
            {mechanic.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'M'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-card-foreground">{mechanic.full_name}</h3>
                {mechanic.is_verified && (
                  <div title="Verified">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
              {mechanic.experience_years && (
                <p className="text-sm text-muted-foreground">
                  {mechanic.experience_years} years experience
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-accent text-accent" />
              <span className="font-semibold text-card-foreground">{mechanic.rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({mechanic.total_reviews})</span>
            </div>
          </div>

          {mechanic.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{mechanic.location}</span>
            </div>
          )}

          {mechanic.services_offered && mechanic.services_offered.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground mt-1" />
              <div className="flex flex-wrap gap-2">
                {mechanic.services_offered.slice(0, 4).map((service, index) => (
                  <Badge key={index} variant="secondary">
                    {service}
                  </Badge>
                ))}
                {mechanic.services_offered.length > 4 && (
                  <Badge variant="outline">+{mechanic.services_offered.length - 4} more</Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="cta"
              size="sm"
              onClick={() => onBookService(mechanic.user_id)}
              disabled={!mechanic.is_available}
            >
              {mechanic.is_available ? 'Book Service' : 'Unavailable'}
            </Button>
            {mechanic.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${mechanic.phone}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
