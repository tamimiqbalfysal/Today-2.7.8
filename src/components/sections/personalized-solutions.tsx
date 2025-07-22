"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPersonalizedSolution } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  regulatoryNeeds: z.string().min(2, { message: "Please describe your regulatory needs." }),
  companySize: z.string({ required_error: "Please select a company size." }),
  techStack: z.string().min(2, { message: "Please list your main technologies." }),
  riskTolerance: z.string({ required_error: "Please select your risk tolerance." }),
});

export default function PersonalizedSolutions() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regulatoryNeeds: "",
      companySize: undefined,
      techStack: "",
      riskTolerance: undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setResult(null);
    startTransition(async () => {
      const { data, error } = await getPersonalizedSolution(values);
      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }
      setResult(data);
    });
  };

  return (
    <section id="consultation" className="py-12 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
            Tailor Your Cloud Solution
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-muted-foreground md:text-lg">
            Answer a few questions and our AI will generate a personalized recommendation. This is your first step towards a bespoke cloud strategy and the basis for your consultation.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <Card className="rounded-lg shadow-lg">
            <CardHeader>
              <CardTitle>Tell Us About Your Business</CardTitle>
              <CardDescription>
                Provide some details and we'll craft the perfect starting point.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your company size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Startup (1-50 employees)">Startup (1-50 employees)</SelectItem>
                            <SelectItem value="SMB (51-500 employees)">SMB (51-500 employees)</SelectItem>
                            <SelectItem value="Enterprise (501+ employees)">Enterprise (501+ employees)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Tech Stack</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Python, Django, PostgreSQL, AWS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="regulatoryNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regulatory or Compliance Needs</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., HIPAA, GDPR, SOC 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="riskTolerance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Tolerance</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your risk tolerance" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low - Prioritize stability and proven tech</SelectItem>
                            <SelectItem value="Medium">Medium - Balanced approach to new features</SelectItem>
                            <SelectItem value="High">High - Eager to adopt cutting-edge tech</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Generate Recommendation
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="mt-8 lg:mt-0">
             <Card className="min-h-[550px] bg-card flex flex-col rounded-lg shadow-lg">
                <CardHeader>
                  <CardTitle>Your Personalized Recommendation</CardTitle>
                  <CardDescription>
                    Our AI-powered analysis of your cloud needs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  {isPending && (
                    <div className="space-y-4 pt-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  )}
                  {result && (
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap font-body leading-relaxed">
                      {result}
                    </div>
                  )}
                  {!result && !isPending && (
                    <div className="text-center text-muted-foreground m-auto">
                      <Wand2 className="mx-auto h-12 w-12 opacity-50 mb-4"/>
                      <p>Your recommendation will appear here.</p>
                    </div>
                  )}
                </CardContent>
             </Card>
          </div>

        </div>
      </div>
    </section>
  );
}
