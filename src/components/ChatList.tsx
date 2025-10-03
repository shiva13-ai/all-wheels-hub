import { useEffect, useState } from "react";
import { chatService, type ChatRoom } from "@/services/supabase/chat";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatInterface } from "./ChatInterface";

export const ChatList = () => {
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
      const { data, error } = await chatService.getUserChatRooms();
      if (error) throw error;
      setChatRooms(data || []);
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
      <div className="container mx-auto py-8">
        <p className="text-center">Loading chats...</p>
      </div>
    );
  }

  if (selectedRoom) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <ChatInterface
          chatRoomId={selectedRoom.id}
          bookingInfo={selectedRoom.booking as any}
          onBack={() => setSelectedRoom(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      {chatRooms.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
          <p className="text-muted-foreground">
            Your conversations will appear here once you start chatting with mechanics or customers.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {chatRooms.map((room: any) => (
            <Card
              key={room.id}
              className="p-4 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => setSelectedRoom(room)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {room.booking?.service_type || "Service Request"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {room.booking?.location || "Location not specified"}
                  </p>
                  {room.last_message_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last message: {new Date(room.last_message_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
