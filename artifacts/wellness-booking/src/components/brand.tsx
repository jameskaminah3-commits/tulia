import { Link } from 'wouter';
import { Waves } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" data-testid="link-brand-home">
      <span className="grid size-9 place-items-center rounded-full bg-secondary text-primary shadow-sm">
        <Waves className="size-5" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-xl font-semibold tracking-tight">Tulia</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.25em] text-secondary">Mombasa wellness</span>
        </span>
      )}
    </Link>
  );
}