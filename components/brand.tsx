import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-2.5" aria-label="Bitvora home">
      <span className="logo-mark"><span>B</span></span>
      {!compact && <span className="text-lg font-semibold tracking-tight text-white">Bitvora</span>}
    </Link>
  );
}
