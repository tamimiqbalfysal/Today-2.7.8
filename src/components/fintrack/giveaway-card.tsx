
'use client';

import { useState } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GiveawayCardProps {
  currentUser: User | null;
  onGiveAway: (amount: number) => Promise<void>;
}

export function GiveawayCard({ currentUser, onGiveAway }: GiveawayCardProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleGiveAwayClick = async () => {
    const giveawayAmount = parseInt(amount, 10);
    if (isNaN(giveawayAmount) || giveawayAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid number of credits to give away.',
      });
      return;
    }

    setIsSubmitting(true);
    await onGiveAway(giveawayAmount);
    setIsSubmitting(false);
    setAmount('');
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          Share the Love
        </CardTitle>
        <CardDescription>
          Give away some of your credits to all other users. They will be distributed based on their contribution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="giveaway-amount">Amount to Give Away</Label>
          <Input
            id="giveaway-amount"
            type="number"
            placeholder={`Your credits: ${currentUser?.credits || 0}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <Button
          className="w-full"
          onClick={handleGiveAwayClick}
          disabled={isSubmitting || !amount}
        >
          {isSubmitting ? 'Distributing...' : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Give Away Credits
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
