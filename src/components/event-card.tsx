import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { formatBRL, type EventItem } from "@/lib/events-data";

export function EventCard({ event }: { event: EventItem }) {
  const date = new Date(event.date);
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "UTC" });
  const month = date
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .replace(".", "")
    .toUpperCase();

  return (
    <Link
      to="/eventos/$slug"
      params={{ slug: event.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-glow"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          loading="lazy"
          width={1200}
          height={800}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-card/95 px-3 py-2 text-center shadow-card backdrop-blur">
          <span className="text-xs font-semibold text-brand">{month}</span>
          <span className="font-display text-2xl font-bold leading-none text-foreground">
            {day}
          </span>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-foreground shadow-card backdrop-blur">
          {event.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-2">
          {event.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {event.subtitle}
        </p>
        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            <span>
              {date.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                timeZone: "UTC",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand" />
            <span className="line-clamp-1">
              {event.venue} — {event.city}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="font-display text-lg font-bold text-foreground">
              {formatBRL(event.fromPrice)}
            </p>
          </div>
          <span className="text-sm font-semibold text-brand group-hover:underline">
            Ver ingressos →
          </span>
        </div>
      </div>
    </Link>
  );
}
