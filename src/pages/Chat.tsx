import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

// Re-defining types and service logic (Inline)

interface BookingReference {
  id: string;
  service_type: string;
  location: string;
  user_id: string;
  mechanic_id: string | null;
  status: string;
  vehicle_type: string;
}

interface ChatRoom {
  id: string;
  booking_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  booking?: BookingReference;
}

interface SenderProfile {
  full_name: string | null;
  avatar_url: string | null;
  user_id: string;
}

interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  is_read: boolean;
  sender?: SenderProfile;
}

// --- Chat Interface Component Logic (Inline) ---
interface ChatInterfaceProps {
  chatRoomId: string;
  bookingInfo?: {
    service_type: string;
    location: string;
    user_id: string;
    mechanic_id: string | null;
  };
  onBack?: () => void;
}

const ChatInterface = ({ chatRoomId, bookingInfo, onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to mark messages as read
  const markAsRead = async (roomId: string) => {
    if (!user) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_room_id', roomId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  };
  
  // Helper to fetch messages with sender profiles
  const fetchMessages = async (roomId: string) => {
     const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', roomId)
      .order('created_at', { ascending: true });

    if (error || !messages) return { data: null, error };

    // Fetch sender profiles separately
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p as SenderProfile]) || []);

    const messagesWithSenders = messages.map(msg => ({
      ...msg,
      sender: profileMap.get(msg.sender_id),
    })) as Message[];

    return { data: messagesWithSenders, error: null };
  }

  useEffect(() => {
    // Load messages
    fetchMessages(chatRoomId).then(({data, error}) => {
        if (error) {
            toast({title: "Error", description: error.message, variant: "destructive",});
        } else {
            setMessages(data || []);
            markAsRead(chatRoomId);
        }
        setLoading(false);
    });

    // Subscribe to new messages
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
              .maybeSingle();

            const newMessageWithSender: Message = {
                ...message,
                sender: profile as SenderProfile || undefined,
            }

            setMessages((prev) => [...prev, newMessageWithSender]);
            markAsRead(chatRoomId);
            
            // Scroll to bottom when new message arrives
            setTimeout(() => {
              scrollRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, user]);

  useEffect(() => {
    // Scroll to bottom when messages load
    if (!loading) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_id: user.id,
          message_text: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[70vh] max-h-[800px] shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h3 className="font-semibold">{bookingInfo?.service_type || "Chat"}</h3>
          {bookingInfo?.location && (
            <p className="text-sm text-muted-foreground">{bookingInfo.location}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            const displayName = message.sender?.full_name || (isOwn ? "You" : "Them");
            
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {displayName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                  {!isOwn && (
                    <span className="text-xs text-muted-foreground mb-1">
                      {displayName}
                    </span>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 break-words ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted rounded-tl-none"
                    }`}
                  >
                    <p className="text-sm">{message.message_text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </Card>
  );
};
// --- End of Chat Interface Component Logic ---


// --- Main Chat Page Component ---
const ChatPage = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  const loadChatRooms = async () => {
    try {
      if (!user) return;
      
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

      if (error) throw error;

      // Filter to only show rooms where user is a participant and the booking is not cancelled
      const filtered = data?.filter((room: any) => {
        const booking = room.booking as BookingReference;
        return booking && (booking.user_id === user.id || booking.mechanic_id === user.id) && booking.status !== 'cancelled';
      }) as ChatRoom[];

      setChatRooms(filtered || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8 mt-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (selectedRoom) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8 mt-20 max-w-4xl">
            <ChatInterface
              chatRoomId={selectedRoom.id}
              bookingInfo={selectedRoom.booking as any}
              onBack={() => setSelectedRoom(null)}
            />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 mt-20 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>

        {chatRooms.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No active conversations</h3>
            <p className="text-muted-foreground">
              Your conversations will appear here after you successfully book a service.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {chatRooms.map((room) => (
              <Card
                key={room.id}
                className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => setSelectedRoom(room)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {room.booking?.service_type || "Service Request"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{room.booking?.location || "Location not specified"}</span>
                    </p>
                    {room.last_message_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last message: {new Date(room.last_message_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
