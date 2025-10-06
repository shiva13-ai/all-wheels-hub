-- Add policy for mechanics to view pending bookings (requests)
CREATE POLICY "Mechanics can view pending bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  status = 'pending' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'mechanic'
  )
);

-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;