import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative w-full py-24 lg:py-32 xl:py-48 bg-card overflow-hidden">
        <div className="absolute inset-0 z-0">
             <Image 
                src="https://placehold.co/1920x1080.png" 
                alt="Abstract blue background" 
                fill
                style={{objectFit: 'cover'}}
                className="opacity-10"
                data-ai-hint="abstract blue"
                priority
             />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        </div>

      <div className="container px-4 md:px-6 relative z-10">
        <div className="grid gap-6 lg:grid-cols-1 lg:gap-x-12 xl:gap-x-16">
          <div className="flex flex-col justify-center space-y-4 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                The Apex of Cloud Infrastructure for Enterprise
              </h1>
              <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
                Scalable, secure, and relentlessly reliable solutions designed to elevate your business to new heights.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
               <Button size="lg" asChild className="w-full">
                  <a href="#consultation">Request a Consultation</a>
               </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
