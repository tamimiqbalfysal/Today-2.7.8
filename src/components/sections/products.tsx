import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Server, Database, HardDrive, Shield } from "lucide-react";

const products = [
  {
    icon: <Server className="w-8 h-8 text-primary" />,
    title: "Elastic Compute",
    description: "Dynamically scalable virtual machines to power your most demanding applications with ease.",
    price: "Starting at $0.05/hr",
  },
  {
    icon: <Database className="w-8 h-8 text-primary" />,
    title: "Managed Databases",
    description: "Fault-tolerant, fully managed SQL and NoSQL databases for mission-critical data.",
    price: "Starting at $50/mo",
  },
  {
    icon: <HardDrive className="w-8 h-8 text-primary" />,
    title: "Quantum Storage",
    description: "High-throughput, durable object storage with a globally distributed footprint.",
    price: "Starting at $0.02/GB",
  },
  {
    icon: <Shield className="w-8 h-8 text-primary" />,
    title: "Aegis Security",
    description: "Comprehensive threat detection and protection for your entire cloud environment.",
    price: "Starting at $100/mo",
  },
];

export default function Products() {
  return (
    <section id="products" className="py-12 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
            Our Premier Cloud Offerings
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
            A suite of powerful, enterprise-ready services built for performance and reliability.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <Card key={product.title} className="flex flex-col text-center items-center hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <CardHeader>
                {product.icon}
              </CardHeader>
              <CardContent className="flex-grow flex flex-col items-center p-6 pt-0">
                <CardTitle className="mb-2 text-xl font-semibold">{product.title}</CardTitle>
                <CardDescription className="flex-grow">{product.description}</CardDescription>
                <p className="mt-4 font-bold text-primary">{product.price}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
