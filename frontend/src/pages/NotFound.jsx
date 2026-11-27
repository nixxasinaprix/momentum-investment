import { useEffect } from "react";
import { Compass, Home } from "lucide-react";
import { Badge, BrandMark, Button, GlassCard, ThemeToggle } from "../components/ui";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page Not Found · Momentum Investment";
  }, []);

  return (
    <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center text-[var(--text-primary)] antialiased transition-colors duration-700">
      <div className="fixed right-4 top-4 z-20">
        <div className="lab-card rounded-full bg-gradient-to-tr from-brand-coral via-brand-gold to-brand-plum p-[1.5px] shadow-md">
          <ThemeToggle />
        </div>
      </div>

      <GlassCard
        variant="elevated"
        padding="p-8 sm:p-10"
        className="relative z-10 max-w-md rounded-3xl"
      >
        <div className="mb-6 flex justify-center">
          <BrandMark title="Momentum Investment" />
        </div>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-coral/35 bg-brand-coral/15 text-brand-plum dark:border-brand-coral/30 dark:bg-brand-coral/10 dark:text-brand-coral">
          <Compass className="h-7 w-7" />
        </div>

        <div className="mt-5">
          <Badge variant="coral" size="md">
            404 · Route Not Found
          </Badge>
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="bg-gradient-to-r from-brand-plum via-brand-coral to-brand-gold bg-clip-text text-transparent dark:from-brand-coral dark:via-brand-gold dark:to-surface-cream">
            This research page doesn&apos;t exist
          </span>
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-muted)]">
          The URL you requested is not part of the Momentum Investment workspace.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" pill size="lg" to="/picks">
            Go to Today&apos;s Picks
          </Button>
          <Button variant="secondary" pill size="lg" to="/">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
      </GlassCard>
    </main>
  );
}
