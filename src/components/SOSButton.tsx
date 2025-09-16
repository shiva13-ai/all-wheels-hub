import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { SOSModal } from './SOSModal';

export const SOSButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg hover:shadow-xl z-50 bg-red-600 hover:bg-red-700"
        onClick={() => setIsModalOpen(true)}
      >
        <AlertTriangle className="w-8 h-8" />
      </Button>
      
      <SOSModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};