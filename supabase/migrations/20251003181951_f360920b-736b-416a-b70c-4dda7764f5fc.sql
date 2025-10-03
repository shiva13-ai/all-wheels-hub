-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(booking_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view their booking chat rooms"
ON public.chat_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = chat_rooms.booking_id
    AND (bookings.user_id = auth.uid() OR bookings.mechanic_id = auth.uid())
  )
);

CREATE POLICY "System can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chat rooms"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    JOIN public.bookings ON bookings.id = chat_rooms.booking_id
    WHERE chat_rooms.id = messages.chat_room_id
    AND (bookings.user_id = auth.uid() OR bookings.mechanic_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their chat rooms"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chat_rooms
    JOIN public.bookings ON bookings.id = chat_rooms.booking_id
    WHERE chat_rooms.id = messages.chat_room_id
    AND (bookings.user_id = auth.uid() OR bookings.mechanic_id = auth.uid())
  )
);

CREATE POLICY "Users can update their messages read status"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    JOIN public.bookings ON bookings.id = chat_rooms.booking_id
    WHERE chat_rooms.id = messages.chat_room_id
    AND (bookings.user_id = auth.uid() OR bookings.mechanic_id = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX idx_chat_rooms_booking_id ON public.chat_rooms(booking_id);
CREATE INDEX idx_messages_chat_room_id ON public.messages(chat_room_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable Realtime for messages
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Trigger to update chat_rooms.updated_at and last_message_at
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = now(), last_message_at = now()
  WHERE id = NEW.chat_room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_room_timestamp();