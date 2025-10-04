import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LocationMapPicker } from './LocationMapPicker';

interface MapPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: string, latitude: number, longitude: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export const MapPickerDialog = ({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
}: MapPickerDialogProps) => {
  const handleLocationSelect = (location: string, latitude: number, longitude: number) => {
    onLocationSelect(location, latitude, longitude);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Location on Map</DialogTitle>
        </DialogHeader>
        <LocationMapPicker
          onLocationSelect={handleLocationSelect}
          initialLat={initialLat}
          initialLng={initialLng}
        />
      </DialogContent>
    </Dialog>
  );
};
