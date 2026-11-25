import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page Not Found · Momentum Investment";
  }, []);

  return (
    <main className="dark flex min-h-[100dvh] flex-col items-center justify-center bg-[#07080F] px-4 text-center text-white antialiased">
      <div className="rounded-3xl border border-white/10 bg-[#12131F]/90 p-10 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F0867C]/30 bg-[#F0867C]/10 text-[#F0867C]">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-[#F0867C]">
          404 · Route Not Found
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          This research page doesn&apos;t exist
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">
          The URL you requested is not part of the Momentum Investment workspace.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8C4570] to-[#F0867C] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-stone-200 transition hover:border-white/30"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
