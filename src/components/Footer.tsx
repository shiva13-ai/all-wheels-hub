import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wrench, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-card-foreground">ServiceHub</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your trusted partner for all vehicle services. Connect with verified mechanics, 
              shop accessories, and get emergency assistance 24/7.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Linkedin className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-card-foreground mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Bicycle Repair</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Bike Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Auto Repair</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Car Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Emergency SOS</a></li>
            </ul>
          </div>

          {/* For Mechanics */}
          <div>
            <h3 className="font-semibold text-card-foreground mb-4">For Mechanics</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Join as Mechanic</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Mechanic Dashboard</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Earnings</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Training</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-card-foreground mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Safety</a></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <p className="text-sm text-muted-foreground">
            © 2024 ServiceHub. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};