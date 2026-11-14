import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
      <h1 className="wide text-3xl font-extrabold">Page not found</h1>
      <p className="mt-3 text-muted">That page does not exist. Try the investigations list or the habitat builder.</p>
      <p className="mt-6 flex gap-5">
        <Link href="/explore" className="text-flame underline underline-offset-2">Explore investigations</Link>
        <Link href="/" className="text-flame underline underline-offset-2">Build a brief</Link>
      </p>
    </main>
  );
}
