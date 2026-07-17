import { LoadingCard } from "@/components/ui";
export default function Loading() { return <div className="app-bg min-h-screen p-5"><div className="mx-auto max-w-4xl space-y-5 pt-20"><LoadingCard/><div className="grid gap-5 sm:grid-cols-2"><LoadingCard/><LoadingCard/></div></div></div>; }
