import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import Hero from '@/components/sections/hero';
import Products from '@/components/sections/products';
import Testimonials from '@/components/sections/testimonials';
import PersonalizedSolutions from '@/components/sections/personalized-solutions';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Products />
        <Separator className="my-12 md:my-24 bg-border/40" />
        <PersonalizedSolutions />
        <Separator className="my-12 md:my-24 bg-border/40" />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
