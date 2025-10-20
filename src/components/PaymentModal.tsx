import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onPaymentSuccess: (paymentMethod: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, amount, onPaymentSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('upi');
  const { toast } = useToast();

  const handlePayment = async () => {
    setProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessing(false);
    
    toast({
        title: "Payment Successful!",
        description: `₹${amount.toFixed(2)} has been paid via ${activeTab.toUpperCase()}.`
    });
    
    onPaymentSuccess(activeTab);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            Total Amount: <span className="font-bold text-primary text-lg">₹{amount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upi">UPI</TabsTrigger>
            <TabsTrigger value="card">Card</TabsTrigger>
            <TabsTrigger value="netbanking">Net Banking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upi" className="space-y-4 mt-4">
            <div className="space-y-2">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input id="upi-id" placeholder="yourname@bank" />
            </div>
            <p className="text-xs text-center text-muted-foreground">A payment request will be sent to your UPI app.</p>
          </TabsContent>
          
          <TabsContent value="card" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <Input id="card-number" placeholder="0000 0000 0000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input id="expiry" placeholder="MM/YY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" placeholder="123" />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="netbanking" className="space-y-4 mt-4">
            <p className="text-sm text-center text-muted-foreground pt-4">You will be redirected to your bank's website to complete the payment.</p>
          </TabsContent>
        </Tabs>

        <Button 
            onClick={handlePayment} 
            disabled={processing} 
            className="w-full mt-4"
        >
          {processing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            activeTab === 'card' ? <CreditCard className="mr-2 h-4 w-4" /> : <Banknote className="mr-2 h-4 w-4" />
          )}
          {processing ? 'Processing...' : `Pay ₹${amount.toFixed(2)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

