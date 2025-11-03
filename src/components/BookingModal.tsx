import React, { useEffect, useState } from 'react';
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
import { Map, AlertTriangle } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { profilesService, UserProfile } from '@/services/supabase/profiles'; // Import profilesService

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleType: 'bicycle' | 'bike' | 'car' | 'truck';
  services: Array<{ name: string; price: number }>;
  preSelectedMechanicId?: string;
}

// --- CONFIG: URL for the Supabase Edge Function to handle the external alert ---
// NOTE: This URL is no longer used in the client-side fetch, but kept for context.
const GUARDIAN_ALERT_WEBHOOK_URL = "https://zkpfbiwqgywgmfgbbitg.supabase.co/functions/v1/guardian-alert";

// Function to check if the current time is between 8 PM (20:00) and 6 AM (06:00)
const isLateNight = () => {
  const currentHour = new Date().getHours();
  // 20, 21, 22, 23, 0, 1, 2, 3, 4, 5
  return currentHour >= 12 || currentHour < 6;
};

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); 

  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch full user profile when the modal opens
  useEffect(() => {
    if (isOpen && user) {
        profilesService.getProfileByAuth().then(({ data }) => {
            if (data) {
                setUserProfile(data);
            }
        });
    } else if (!isOpen) {
        // Reset profile state when closing
        setUserProfile(null);
    }
  }, [isOpen, user]);


  const handleServiceSelect = (serviceName: string) => {
    const selected = services.find(s => s.name === serviceName);
    if (selected) {
      setServicePrice(selected.price);
      setFormData({ ...formData, service_type: serviceName });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to book a service.',
        variant: 'destructive',
      });
      return;
    }

    // --- Security Check Logic ---
    const isFemaleUser = userProfile.gender === 'female' && userProfile.role === 'user';
    const isAlertRequired = isFemaleUser && isLateNight();
    const guardianPhoneExists = !!userProfile.guardian_phone;

    if (isAlertRequired && !guardianPhoneExists) {
        toast({
            title: 'Safety Alert',
            description: 'For your safety, late-night requests require an Emergency Contact on your profile. Please update your profile.',
            variant: 'destructive',
        });
        return;
    }
    // --- End Security Check Logic ---

    setLoading(true);
    
    // Prepare final booking data, including the security flag
    const bookingDataWithAlert: CreateBookingData = {
        ...formData,
        estimated_cost: servicePrice,
        // The front-end sets the flag, and the backend trigger will handle the sending.
        is_late_night_alert: isAlertRequired, 
    };

    try {
      const { data: booking, error } = await bookingsService.createBooking(bookingDataWithAlert);
      if (error) {
        throw error;
      }
      
      // --- START: Database Trigger handles the Safety Alert ---
      // We rely on the SQL trigger function now, so we only need client-side confirmation.
      if (isAlertRequired) {
          console.log("Safety protocol flagged. Database trigger will handle alert call via pg_net.");
          toast({
              title: 'Safety Protocol Flagged',
              description: `This is a late-night service request. The database trigger is running to notify your emergency contact.`,
              variant: 'destructive',
              duration: 8000,
          });
      }
      // --- END: Database Trigger handles the Safety Alert ---

      
      // Create chat room for the booking
      if (booking?.id) {
        await chatService.ensureChatRoom(booking.id);
      }
      
      // Final success toast (non-alert toast, if alert wasn't required)
      if (!isAlertRequired) {
          toast({
            title: 'Request sent!',
            description: 'Nearby mechanics have been notified. You\'ll be notified when a mechanic accepts.',
          });
      }
      
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
  
  // Dynamic visibility for late-night warning banner
  const isFemaleUser = userProfile?.gender === 'female' && userProfile.role === 'user';
  const showWarningBanner = isFemaleUser && isLateNight();
  const warningText = isFemaleUser && !userProfile?.guardian_phone 
    ? "WARNING: Late-night requests require you to set an Emergency Contact in your profile."
    : "Safety Note: This is a late-night service. Your Emergency Contact will be notified for your safety.";

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
          
          {showWarningBanner && (
              <div className={`p-3 rounded-lg flex items-center gap-3 ${isFemaleUser && !userProfile?.guardian_phone ? 'bg-red-100 border border-red-400' : 'bg-yellow-100 border border-yellow-400'}`}>
                  <AlertTriangle className={`h-5 w-5 ${isFemaleUser && !userProfile?.guardian_phone ? 'text-red-600' : 'text-yellow-600'}`} />
                  <p className={`text-sm ${isFemaleUser && !userProfile?.guardian_phone ? 'text-red-800' : 'text-yellow-800'}`}>
                      {warningText}
                  </p>
              </div>
          )}

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
