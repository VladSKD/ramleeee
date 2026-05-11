import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2" aria-label="RALLY — на головну">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft transition-transform group-hover:scale-105">
        <span className="font-display text-lg font-bold">R</span>
      </span>
      <span className="font-display text-xl font-bold tracking-tight">RALLY</span>
    </Link>
  );
}