import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, ChevronRight, CircleAlert, Clock3, Command, LayoutDashboard, LogOut, Menu, RefreshCw, Sparkles, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import type { BookingStatus, TherapistStatus } from '@workspace/api-client-react';
import { Brand } from '@/components/brand';
import { formatKes, formatTime, statusLabel, therapistStatusLabel } from '@/lib/format';

export function PageLoader({ label = 'Loading live details' }: { label?: string }) {
  return (
    <div className="space-y-4" aria-label={label} data-testid="state-loading">
      <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function ErrorState({ onRetry, message = 'We could not reach the Tulia control room.' }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-5" data-testid="state-error">
      <CircleAlert className="size-5 text-accent-foreground" />
      <div>
        <p className="font-semibold text-primary">A small tide against us</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5" data-testid="button-retry">
        <RefreshCw className="size-4" /> Try again
      </button>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center" data-testid="state-empty">
      <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-secondary/20 text-primary"><Sparkles className="size-5" /></div>
      <p className="font-semibold text-primary">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'coral' | 'gold' | 'dark' }) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    teal: 'bg-secondary/20 text-primary',
    coral: 'bg-accent/15 text-accent-foreground',
    gold: 'bg-chart-3/20 text-primary',
    dark: 'bg-primary text-primary-foreground',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${tones[tone]}`}>{children}</span>;
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const tone = status === 'confirmed' ? 'teal' : status === 'completed' ? 'dark' : status === 'cancelled' || status === 'no_show' ? 'coral' : status === 'in_progress' ? 'gold' : 'neutral';
  return <Pill tone={tone}>{statusLabel(status)}</Pill>;
}

export function TherapistStatusPill({ status }: { status: TherapistStatus }) {
  return <Pill tone={status === 'available' ? 'teal' : status === 'on_job' ? 'gold' : 'neutral'}><span className="mr-1.5 size-1.5 rounded-full bg-current" />{therapistStatusLabel(status)}</Pill>;
}

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const links = [
    { href: '/ops', label: 'Operations', icon: LayoutDashboard },
    { href: '/therapists', label: 'Therapist roster', icon: UsersRound },
  ];
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <Brand />
          <button type="button" className="rounded-lg p-1 text-sidebar-foreground/70 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X className="size-5" /></button>
        </div>
        <div className="mt-10">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/45">Control room</p>
          <nav className="space-y-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${location === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon className={`size-[18px] ${location === href ? 'text-sidebar-primary' : ''}`} />{label}
                {location === href && <ChevronRight className="ml-auto size-4 opacity-60" />}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto">
          <div className="mb-5 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
            <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/45">Dispatch status</span><span className="size-2 rounded-full bg-secondary" /></div>
            <p className="text-sm font-semibold">All systems steady</p>
            <p className="mt-1 text-xs leading-5 text-sidebar-foreground/55">Bookings and therapist signals are current.</p>
          </div>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 transition hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="link-back-to-booking"><LogOut className="size-[18px]" /> Back to booking</Link>
        </div>
      </aside>
      {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-primary/30 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-menu-overlay" />}
      <div className="md:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur md:px-10">
          <button type="button" className="rounded-lg p-2 text-primary md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu className="size-5" /></button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><Command className="size-3.5" /> Tulia control room <span className="text-border">/</span> {location === '/therapists' ? 'Therapist roster' : 'Operations'}</div>
          <div className="ml-auto flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-xs font-bold text-primary">Dispatch desk</span><span className="block text-[11px] text-muted-foreground">Mombasa, EAT</span></span><span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">DK</span></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-7 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-secondary-foreground">{eyebrow}</p>}<h1 className="font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">{title}</h1>{body && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p>}</div>{action}</div>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'teal' }: { label: string; value: string; detail: string; icon: typeof Activity; tone?: 'teal' | 'coral' | 'gold' | 'ink' }) {
  const toneClass = tone === 'coral' ? 'bg-accent/15 text-accent-foreground' : tone === 'gold' ? 'bg-chart-3/20 text-primary' : tone === 'ink' ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 text-primary';
  return <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_8px_28px_hsl(179_48%_16%/.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_hsl(179_48%_16%/.08)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p></div><span className={`grid size-10 place-items-center rounded-xl ${toneClass}`}><Icon className="size-[18px]" /></span></div><p className="mt-4 text-xs text-muted-foreground">{detail}</p></div>;
}

export function EmptySlots() {
  return <div className="py-10 text-center"><Clock3 className="mx-auto size-7 text-muted-foreground/60" /><p className="mt-3 text-sm font-semibold text-primary">No slots showing yet</p><p className="mt-1 text-xs text-muted-foreground">Try another date or service mode.</p></div>;
}

export function MiniBooking({ reference, name, treatment, start, price, status, onStatus }: { reference: string; name: string; treatment: string; start: string; price: number; status: BookingStatus; onStatus: (status: BookingStatus) => void }) {
  return <div className="group flex flex-col gap-4 border-b border-border/70 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between" data-testid={`booking-row-${reference}`}><div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/15 text-xs font-bold text-primary">{name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-primary">{name}</p><p className="truncate text-xs text-muted-foreground">{treatment} <span className="px-1 text-border">·</span> {reference}</p></div></div><div className="flex items-center gap-4 sm:justify-end"><div className="text-left sm:text-right"><p className="text-sm font-bold text-primary">{formatTime(start)}</p><p className="text-xs text-muted-foreground">{formatKes(price)}</p></div><BookingStatusPill status={status} /><select value={status} onChange={(event) => onStatus(event.target.value as BookingStatus)} className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-ring" aria-label={`Update ${reference} status`} data-testid={`select-status-${reference}`}><option value="pending_payment">Pending payment</option><option value="confirmed">Confirmed</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select></div></div>;
}