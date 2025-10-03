import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, User, Wrench, MessageCircle } from "lucide-react";

export const Header = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate('/auth');
    }
  };
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AutoAid</span>
          </div>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#services" className="text-foreground hover:text-primary transition-colors">
              Services
            </a>
            <a href="#mechanics" className="text-foreground hover:text-primary transition-colors">
              Find Mechanics
            </a>
            <a href="#store" className="text-foreground hover:text-primary transition-colors">
              Store
            </a>
            <a href="#emergency" className="text-foreground hover:text-primary transition-colors">
              Emergency
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {user && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/chat')}
                className="relative"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            )}
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full"></span>
            </Button>
            
            <Button 
              variant="outline" 
              className="hidden sm:flex"
              onClick={handleAuthAction}
            >
              <User className="w-4 h-4 mr-2" />
              {user ? `Welcome, ${profile?.full_name || 'User'}` : 'Sign In'}
            </Button>
            
            {user && (
              <Button variant="ghost" onClick={signOut} className="hidden sm:flex">
                Sign Out
              </Button>
            )}
            
            <Button variant="hero">
              Join as Mechanic
            </Button>
            
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};