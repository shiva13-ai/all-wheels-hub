import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { profilesService } from "@/services/supabase/profiles";
import { 
  Loader2, 
  User, 
  Wrench, 
  Store, 
  Briefcase, 
  Map, 
  PersonStanding, 
  Shield, 
  User as UserIcon // Aliasing 'User' to 'UserIcon' for Female icon display
} from "lucide-react"; 
import { Switch } from "@/components/ui/switch";
import { MapPickerDialog } from "@/components/MapPickerDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const SERVICES = [
  'Engine Repair', 'Brake Service', 'Oil Change', 'Tire Service',
  'Battery Service', 'AC Repair', 'Electrical Work', 'Body Work',
  'Transmission Repair', 'General Maintenance'
];

export default function Profile() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Profile fields (Updated to include gender and guardian info)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('prefer_not_to_say'); 
  const [guardianPhone, setGuardianPhone] = useState(''); 

  // Mechanic-specific fields
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  // Logic to determine if the user is a female vehicle owner, triggering the guardian field
  const isFemaleUser = profile?.role === 'user' && gender === 'female';


  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      // Load new fields, providing defaults for robustness
      setGender(profile.gender || 'prefer_not_to_say');
      setGuardianPhone(profile.guardian_phone || '');
      
      if (profile.role === 'mechanic') {
        setLocation(profile.location || '');
        setLat(profile.latitude || undefined); 
        setLng(profile.longitude || undefined); 
        setExperienceYears(profile.experience_years || '');
        setServicesOffered(profile.services_offered || []);
        setIsAvailable(profile.is_available);
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleServiceToggle = (service: string) => {
    setServicesOffered(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleLocationSelect = (address: string, newLat: number, newLng: number) => {
    setLocation(address);
    setLat(newLat);
    setLng(newLng);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Client-side validation for guardian phone
    if (isFemaleUser && !guardianPhone.trim()) {
        toast({
            title: "Validation Error",
            description: "Emergency Contact (Guardian Phone) is required for safety protocols.",
            variant: "destructive"
        });
        return;
    }


    setLoading(true);
    try {
      const updates = {
        full_name: fullName,
        phone,
        gender: gender, 
        // Only save guardian phone if the user is a female user
        guardian_phone: isFemaleUser ? guardianPhone : null, 
      };

      const mechanicUpdates = profile?.role === 'mechanic' ? {
        location,
        latitude: lat, 
        longitude: lng, 
        experience_years: Number(experienceYears) || 0,
        services_offered: servicesOffered,
        is_available: isAvailable,
      } : {};

      // Send updates to Supabase
      const { error } = await profilesService.updateProfile(user.id, { ...updates, ...mechanicUpdates });

      if (error) throw error;

      await refreshProfile(); // Refresh profile context to show updated data
      toast({
        title: "Profile Updated",
        description: "Your information has been successfully saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Manage Your Profile</h1>
            <p className="text-muted-foreground">Keep your personal and professional details up to date.</p>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User /> Personal Information
                </CardTitle>
                <CardDescription>Update your name, contact details, and gender information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Basic Details */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                
                {/* --- Gender Selection --- */}
                <div className="space-y-3 pt-2">
                  <Label>Gender</Label>
                  <RadioGroup 
                      value={gender} 
                      onValueChange={(value: any) => setGender(value)}
                      className="flex flex-wrap justify-between gap-2"
                      required
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border flex-1 min-w-[45%] hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="male" id="gender-male" />
                      <Label htmlFor="gender-male" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Shield className="w-4 h-4 text-blue-500" /> 
                          Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border flex-1 min-w-[45%] hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="female" id="gender-female" />
                      <Label htmlFor="gender-female" className="flex items-center gap-2 cursor-pointer flex-1">
                          <UserIcon className="w-4 h-4 text-pink-500" />
                          Female
                      </Label>
                    </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border flex-1 min-w-[45%] hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="other" id="gender-other" />
                      <Label htmlFor="gender-other" className="flex items-center gap-2 cursor-pointer flex-1">
                          <PersonStanding className="w-4 h-4 text-green-500" />
                          Other/Prefer not to say
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* --- Guardian Phone for Female Users (Dynamic visibility) --- */}
                {isFemaleUser && (
                  <div className="space-y-2 p-3 border border-pink-300 bg-pink-50/50 rounded-lg">
                      <Label htmlFor="guardian-phone" className="text-pink-600 font-semibold">Emergency Contact (Guardian Phone) *</Label>
                      <Input
                        id="guardian-phone"
                        type="tel"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="Guardian's Phone Number"
                        required={isFemaleUser}
                      />
                       <p className="text-xs text-muted-foreground">
                          For your safety, this number receives alerts for late-night service requests (8 PM - 6 AM).
                      </p>
                  </div>
                )}
                
              </CardContent>
            </Card>

            {/* --- Mechanic Specific Details --- */}
            {profile.role === 'mechanic' && (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store /> Shop Details
                    </CardTitle>
                    <CardDescription>Manage your business location and availability.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Shop Location</Label>
                       <div className="flex gap-2">
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Enter your location or select from map"
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
                       {(lat !== undefined && lng !== undefined) && (
                          <p className="text-xs text-muted-foreground">
                            Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
                          </p>
                        )}
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input id="experience" type="number" value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="availability">Available for new requests</Label>
                            <p className="text-sm text-muted-foreground">
                                Turn this off to temporarily stop receiving new job requests.
                            </p>
                        </div>
                        <Switch
                            id="availability"
                            checked={isAvailable}
                            onCheckedChange={setIsAvailable}
                        />
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase /> Services Offered
                    </CardTitle>
                    <CardDescription>Select the services you provide to appear in relevant searches.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
                     {SERVICES.map((service) => (
                      <Button
                        key={service}
                        type="button"
                        variant={servicesOffered.includes(service) ? 'default' : 'outline'}
                        onClick={() => handleServiceToggle(service)}
                      >
                        {service}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
       <MapPickerDialog
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={lat}
        initialLng={lng}
      />
    </div>
  );
}
