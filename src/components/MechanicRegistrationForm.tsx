import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Camera } from 'lucide-react';
import { profilesService } from '@/services/supabase/profiles';

interface MechanicRegistrationFormProps {
  userId: string;
  onComplete: () => void;
}

const SERVICES = [
  'Engine Repair',
  'Brake Service',
  'Oil Change',
  'Tire Service',
  'Battery Service',
  'AC Repair',
  'Electrical Work',
  'Body Work',
  'Transmission Repair',
  'General Maintenance'
];

export const MechanicRegistrationForm = ({ userId, onComplete }: MechanicRegistrationFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    udyam_registration_number: '',
    experience_years: '',
    services_offered: [] as string[],
  });
  
  const [shopPhoto, setShopPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Photo must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a JPG, PNG, or WebP image',
          variant: 'destructive',
        });
        return;
      }

      setShopPhoto(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadShopPhoto = async (): Promise<string | null> => {
    if (!shopPhoto) return null;

    setUploading(true);
    try {
      const fileExt = shopPhoto.name.split('.').pop();
      const fileName = `${userId}/shop-photo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('mechanic-verification')
        .upload(fileName, shopPhoto);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('mechanic-verification')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.phone || !formData.location) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.udyam_registration_number) {
      toast({
        title: 'Missing Udyam Registration',
        description: 'Please enter your Udyam registration number',
        variant: 'destructive',
      });
      return;
    }

    if (!shopPhoto) {
      toast({
        title: 'Missing verification photo',
        description: 'Please upload a photo with your shop',
        variant: 'destructive',
      });
      return;
    }

    if (formData.services_offered.length === 0) {
      toast({
        title: 'No services selected',
        description: 'Please select at least one service you offer',
        variant: 'destructive',
      });
      return;
    }

    const experienceYears = parseInt(formData.experience_years);
    if (isNaN(experienceYears) || experienceYears < 0) {
      toast({
        title: 'Invalid experience',
        description: 'Please enter a valid number of years of experience',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload photo first
      const shopPhotoUrl = await uploadShopPhoto();
      
      if (!shopPhotoUrl) {
        setLoading(false);
        return;
      }

      // Update profile
      const { error } = await profilesService.updateProfile(userId, {
        full_name: formData.full_name,
        phone: formData.phone,
        location: formData.location,
        role: 'mechanic',
        services_offered: formData.services_offered,
        udyam_registration_number: formData.udyam_registration_number,
        shop_photo_url: shopPhotoUrl,
        experience_years: experienceYears,
        is_verified: false, // Will be verified by admin
      });

      if (error) throw error;

      toast({
        title: 'Registration submitted',
        description: 'Your mechanic profile is pending verification. You will be notified once approved.',
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter your phone number"
            required
          />
        </div>

        <div>
          <Label htmlFor="location">Shop Location *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Enter your shop address"
            required
          />
        </div>

        <div>
          <Label htmlFor="udyam">Udyam Registration Number *</Label>
          <Input
            id="udyam"
            value={formData.udyam_registration_number}
            onChange={(e) => setFormData({ ...formData, udyam_registration_number: e.target.value })}
            placeholder="UDYAM-XX-00-0000000"
            required
          />
          <p className="text-sm text-muted-foreground mt-1">
            Official registration number for your business
          </p>
        </div>

        <div>
          <Label htmlFor="experience">Years of Experience *</Label>
          <Input
            id="experience"
            type="number"
            min="0"
            max="50"
            value={formData.experience_years}
            onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
            placeholder="Enter years of experience"
            required
          />
        </div>

        <div>
          <Label>Verification Photo (You with Your Shop) *</Label>
          <div className="mt-2">
            {photoPreview ? (
              <div className="relative">
                <img 
                  src={photoPreview} 
                  alt="Shop verification" 
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setShopPhoto(null);
                    setPhotoPreview(null);
                  }}
                >
                  Change Photo
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP (MAX. 5MB)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  required
                />
              </label>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a clear photo of yourself at your shop for identity verification
          </p>
        </div>

        <div>
          <Label>Services Offered *</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SERVICES.map((service) => (
              <button
                key={service}
                type="button"
                onClick={() => handleServiceToggle(service)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  formData.services_offered.includes(service)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent border-border'
                }`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading || uploading}>
        {loading || uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploading ? 'Uploading Photo...' : 'Submitting...'}
          </>
        ) : (
          'Complete Registration'
        )}
      </Button>
    </form>
  );
};
