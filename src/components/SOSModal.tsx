import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sosService, CreateSOSData } from '@/services/supabase/sos';
import { useAuth } from '@/contexts/AuthContext';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SOSModal = ({ isOpen, onClose }: SOSModalProps) => {
  const [formData, setFormData] = useState<CreateSOSData>({
    location: '',
    vehicle_type: 'car',
    issue_description: '',
    urgency_level: 'high',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to send an SOS request.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await sosService.createSOSRequest(formData);
      if (error) {
        throw error;
      }
      
      toast({
        title: 'SOS Request Sent!',
        description: 'Help is on the way. A mechanic will contact you shortly.',
      });
      
      onClose();
      setFormData({
        location: '',
        vehicle_type: 'car',
        issue_description: '',
        urgency_level: 'high',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Emergency SOS Request
          </DialogTitle>
          <DialogDescription>
            Send an urgent help request to nearby mechanics
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Current Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter your exact location"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle_type">Vehicle Type</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value: any) => setFormData({ ...formData, vehicle_type: value })}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bicycle">Bicycle</SelectItem>
                <SelectItem value="bike">Motorcycle/Bike</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency_level">Urgency Level</Label>
            <Select
              value={formData.urgency_level}
              onValueChange={(value: any) => setFormData({ ...formData, urgency_level: value })}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical - Dangerous situation</SelectItem>
                <SelectItem value="high">High - Stranded/Emergency</SelectItem>
                <SelectItem value="medium">Medium - Need quick help</SelectItem>
                <SelectItem value="low">Low - Can wait a bit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_description">Issue Description</Label>
            <Textarea
              id="issue_description"
              value={formData.issue_description}
              onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
              placeholder="Describe the problem in detail..."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? 'Sending SOS...' : 'Send SOS Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};