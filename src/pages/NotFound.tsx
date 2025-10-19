import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Frown } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center p-8 mt-20">
        <Frown className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The URL you requested: <code className="bg-muted p-1 rounded">{location.pathname}</code> does not exist.
        </p>
        <Button onClick={() => window.location.href = "/"} variant="cta">
          Go to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
