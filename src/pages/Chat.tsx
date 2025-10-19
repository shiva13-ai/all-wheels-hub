import { supabase } from "@/integrations/supabase/client";

export type ChatRoom = {
  id: string;
  booking_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  booking?: {
    id: string;
    service_type: string;
    location: string;
    user_id: string;
    mechanic_id: string | null;
  };
};

export type Message = {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

export const chatService = {
  // Get or create a chat room for a booking
  async ensureChatRoom(bookingId: string) {
    // Check if chat room exists
    const { data: existing, error: fetchError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching chat room:', fetchError);
      throw fetchError;
    }

    if (existing) {
      return { data: existing, error: null };
    }

    // Create new chat room
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({ booking_id: bookingId })
      .select()
      .single();

    return { data, error };
  },

  // Get all chat rooms for current user
  async getUserChatRooms() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        booking:bookings!chat_rooms_booking_id_fkey(
          id,
          service_type,
          location,
          user_id,
          mechanic_id,
          status,
          vehicle_type
        )
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching chat rooms:', error);
      return { data: null, error };
    }

    // Filter to only show rooms where user is a participant and the booking is not cancelled
    const filtered = data?.filter((room: any) => {
      const booking = room.booking;
      return booking && (booking.user_id === user.id || booking.mechanic_id === user.id) && booking.status !== 'cancelled';
    });

    return { data: filtered, error: null };
  },

  // Get messages for a chat room
  async getMessages(chatRoomId: string) {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: true });

    if (error || !messages) return { data: null, error };

    // Fetch sender profiles separately
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const messagesWithSenders = messages.map(msg => ({
      ...msg,
      sender: profileMap.get(msg.sender_id),
    }));

    return { data: messagesWithSenders as Message[], error: null };
  },

  // Send a message
  async sendMessage(chatRoomId: string, messageText: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: chatRoomId,
        sender_id: user.id,
        message_text: messageText,
      })
      .select()
      .single();

    if (error || !message) return { data: null, error };

    // Fetch sender profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    return {
      data: {
        ...message,
        sender: profile || undefined,
      } as Message,
      error: null,
    };
  },

  // Mark messages as read
  async markAsRead(chatRoomId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_room_id', chatRoomId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    return { error };
  },

  // Subscribe to new messages in a chat room
  subscribeToMessages(chatRoomId: string, callback: (message: Message) => void) {
    const channel = supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        async (payload) => {
          // Fetch the complete message
          const { data: message } = await supabase
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (message) {
            // Fetch sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url')
              .eq('user_id', message.sender_id)
              .single();

            callback({
              ...message,
              sender: profile || undefined,
            } as Message);
          }
        }
      )
      .subscribe();

    return channel;
  },
};

