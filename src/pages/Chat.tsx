import { useAuth } from "@/contexts/AuthContext";
import { ChatList } from "@/components/ChatList";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Navigate } from "react-router-dom";

const Chat = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <ChatList />
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
