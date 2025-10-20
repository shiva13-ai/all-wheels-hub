import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { bookingsService, CreateBookingData } from '@/services/supabase/bookings';
import { chatService } from '@/services/supabase/chat';
import { useAuth } from '@/contexts/AuthContext';
import { MapPickerDialog } from './MapPickerDialog';
import { Map } from 'lucide-react';
import { PaymentModal } from './PaymentModal';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleType: 'bicycle' | 'bike' | 'car' | 'truck';
  services: Array<{ name: string; price: number }>;
  preSelectedMechanicId?: string;
}

export const BookingModal = ({ isOpen, onClose, vehicleType, services, preSelectedMechanicId }: BookingModalProps) => {
  const [formData, setFormData] = useState<CreateBookingData>({
    service_type: '',
    vehicle_type: vehicleType,
    description: '',
    location: '',
    mechanic_id: preSelectedMechanicId,
    latitude: undefined,
    longitude: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [servicePrice, setServicePrice] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleServiceSelect = (serviceName: string) => {
    const selected = services.find(s => s.name === serviceName);
    if (selected) {
      setServicePrice(selected.price);
      setFormData({ ...formData, service_type: serviceName });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to book a service.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await bookingsService.createBooking(formData);
      if (error) {
        throw error;
      }
      
      // Create chat room for the booking
      if (data?.id) {
        await chatService.ensureChatRoom(data.id);
      }
      
      toast({
        title: 'Request sent!',
        description: 'Nearby mechanics have been notified. You\'ll be notified when a mechanic accepts.',
      });
      
      onClose();
      // Open payment modal after successful booking
      setShowPayment(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    // You can add further logic here, like updating booking status to 'paid'
    toast({
      title: "Payment Confirmed",
      description: "Your payment has been processed."
    })
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request {vehicleType} Service</DialogTitle>
            <DialogDescription>
              Send a request to nearby available mechanics
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type</Label>
              <Select
                value={formData.service_type}
                onValueChange={handleServiceSelect}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.name} value={service.name}>
                      {service.name} - ₹{service.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.service_type && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">
                    Service Fare: <span className="text-lg text-primary">₹{services.find(s => s.name === formData.service_type)?.price}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter your location or select from map"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowMapPicker(true)}
                >
                  <Map className="h-4 w-4" />
                </Button>
              </div>
              {formData.latitude && formData.longitude && (
                <p className="text-xs text-muted-foreground">
                  Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue or additional details..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending Request...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <MapPickerDialog
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={(location, latitude, longitude) => {
          setFormData({
            ...formData,
            location,
            latitude,
            longitude,
          });
        }}
        initialLat={formData.latitude}
        initialLng={formData.longitude}
      />

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={servicePrice}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
};

