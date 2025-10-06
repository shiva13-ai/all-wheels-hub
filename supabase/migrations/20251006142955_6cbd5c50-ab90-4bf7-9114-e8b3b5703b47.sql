-- Drop the overly permissive policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to view mechanic profiles (needed for service discovery and booking)
CREATE POLICY "Users can view mechanic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'mechanic');

-- Allow users to view profiles of people they have bookings with
CREATE POLICY "Users can view profiles of booking participants"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE (bookings.user_id = auth.uid() OR bookings.mechanic_id = auth.uid())
      AND (bookings.user_id = profiles.user_id OR bookings.mechanic_id = profiles.user_id)
  )
);