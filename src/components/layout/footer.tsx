export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-border/40">
      <div className="container py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} Altitude Cloud. All rights reserved.</p>
      </div>
    </footer>
  );
}
