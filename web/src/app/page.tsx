import { ClickProbe } from "@/components/click-probe";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-tight">HALO</h1>
      <p className="text-lg leading-8 text-zinc-600">
        In microgravity, a flame becomes a halo. HALO turns NASA&apos;s
        microgravity fire data into a one-page fire brief for your habitat.
      </p>
      <ClickProbe />
    </main>
  );
}
