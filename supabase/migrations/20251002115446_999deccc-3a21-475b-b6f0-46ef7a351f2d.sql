-- Add latitude and longitude columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Add latitude and longitude columns to sos_requests table
ALTER TABLE public.sos_requests 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Add mechanic location tracking columns to bookings
ALTER TABLE public.bookings
ADD COLUMN mechanic_latitude DOUBLE PRECISION,
ADD COLUMN mechanic_longitude DOUBLE PRECISION,
ADD COLUMN mechanic_last_location_update TIMESTAMP WITH TIME ZONE;

-- Add mechanic location tracking columns to sos_requests
ALTER TABLE public.sos_requests
ADD COLUMN mechanic_latitude DOUBLE PRECISION,
ADD COLUMN mechanic_longitude DOUBLE PRECISION,
ADD COLUMN mechanic_last_location_update TIMESTAMP WITH TIME ZONE;

-- Enable realtime for location updates
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.sos_requests REPLICA IDENTITY FULL;