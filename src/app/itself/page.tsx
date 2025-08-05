
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Wand2, Loader2, Sparkles } from 'lucide-react';
import { devilsAdvocate } from '@/ai/flows/devils-advocate';
import type { DevilsAdvocateOutput } from '@/ai/flows/devils-advocate';
import { useToast } from '@/hooks/use-toast';

export default function ItselfPage() {
  const [statement, setStatement] = useState('');
  const [result, setResult] = useState<DevilsAdvocateOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      toast({
        variant: 'destructive',
        title: 'Statement is empty',
        description: 'Please enter a statement to analyze.',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await devilsAdvocate({ statement });
      setResult(response);
    } catch (error) {
      console.error('Error calling devilsAdvocate flow:', error);
      toast({
        variant: 'destructive',
        title: 'An Error Occurred',
        description: 'Failed to get a response. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="flex flex-col h-screen bg-secondary/30">
        <main 
          className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto"
        >
            <Card className="w-full max-w-3xl shadow-xl">
                <CardHeader className="text-center">
                    <Wand2 className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="text-4xl font-bold tracking-tight mt-4">Itself</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Challenge your perspective. Enter any statement and see both sides of the coin.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Textarea
                            placeholder="e.g., Social media does more good than harm."
                            value={statement}
                            onChange={(e) => setStatement(e.target.value)}
                            className="min-h-[100px] text-base"
                            disabled={isLoading}
                        />
                        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Play Devil's Advocate
                                </>
                            )}
                        </Button>
                    </form>

                    {result && (
                        <div className="mt-8 grid md:grid-cols-2 gap-6">
                            <Card className="border-green-500/50">
                                <CardHeader className="flex-row items-center gap-2 space-y-0">
                                    <ThumbsUp className="h-6 w-6 text-green-500" />
                                    <CardTitle>In Favor</CardTitle>
                                </CardHeader>
                                <CardContent className="text-muted-foreground">
                                    {result.inFavor}
                                </CardContent>
                            </Card>
                             <Card className="border-red-500/50">
                                <CardHeader className="flex-row items-center gap-2 space-y-0">
                                    <ThumbsDown className="h-6 w-6 text-red-500" />
                                    <CardTitle>Against</CardTitle>
                                </CardHeader>
                                <CardContent className="text-muted-foreground">
                                    {result.against}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
      </div>
  );
}
