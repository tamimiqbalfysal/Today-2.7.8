import { Button } from "@/components/ui/button";
import { Cloud } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Cloud className="h-6 w-6 text-primary" />
            <span className="font-bold">Altitude Cloud</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button asChild>
            <a href="#consultation">Request a Consultation</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
