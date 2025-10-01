-- Add new columns to profiles table for mechanic registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS udyam_registration_number TEXT,
ADD COLUMN IF NOT EXISTS shop_photo_url TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50);

-- Create storage bucket for mechanic verification photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mechanic-verification',
  'mechanic-verification',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for mechanic verification photos
CREATE POLICY "Users can upload their verification photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'mechanic-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own verification photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'mechanic-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all verification photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'mechanic-verification' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can update their own verification photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'mechanic-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own verification photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'mechanic-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_udyam ON public.profiles(udyam_registration_number) WHERE udyam_registration_number IS NOT NULL;