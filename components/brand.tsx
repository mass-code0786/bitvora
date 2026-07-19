import Link from "next/link";
import { Bitcoin } from "lucide-react";

export function Logo({ compact = false,onClick }: { compact?: boolean;onClick?:()=>void }) {
  const content=<><span className="logo-mark"><Bitcoin aria-hidden="true" size={18} strokeWidth={2.35}/></span>{!compact&&<span className="text-lg font-semibold tracking-tight text-white">Bitvora</span>}</>;
  return onClick?<button type="button" onClick={onClick} className="inline-flex items-center gap-2.5" aria-label="Open Bitvora account menu">{content}</button>:(
    <Link href="/dashboard" className="inline-flex items-center gap-2.5" aria-label="Bitvora home">
      {content}
    </Link>
  );
}
