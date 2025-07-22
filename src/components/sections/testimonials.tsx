import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

const testimonials = [
  {
    quote: "Altitude Cloud's infrastructure has been a game-changer for our scalability and performance. We've seen a 50% reduction in latency.",
    name: "Jane Doe",
    title: "CEO, Innovate Inc.",
    logo: "https://placehold.co/150x50.png",
    logoHint: "tech company"
  },
  {
    quote: "The reliability and security features are second to none. We trust Altitude Cloud with our most sensitive customer data.",
    name: "John Smith",
    title: "CTO, SecureSoft",
    logo: "https://placehold.co/150x50.png",
    logoHint: "security company"
  },
  {
    quote: "Their support team is incredibly responsive and knowledgeable, helping us optimize our environment for cost and efficiency.",
    name: "Emily White",
    title: "Head of Operations, TechCorp",
    logo: "https://placehold.co/150x50.png",
    logoHint: "corporate logo"
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-12 md:py-24 bg-card">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
            Trusted by Industry Leaders
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
            See why leading enterprises choose Altitude Cloud to power their success.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="flex flex-col justify-between hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="mb-4">
                  <Image src={testimonial.logo} alt={`${testimonial.title} logo`} width={120} height={40} className="opacity-70" data-ai-hint={testimonial.logoHint} />
                </div>
                <blockquote className="text-lg italic text-foreground mb-4 flex-grow">
                  “{testimonial.quote}”
                </blockquote>
                <div className="text-right">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
