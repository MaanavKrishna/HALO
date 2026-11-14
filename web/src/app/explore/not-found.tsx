import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
      <h1 className="wide text-3xl font-extrabold">Investigation not found</h1>
      <p className="mt-3 text-muted">HALO has no investigation with that id.</p>
      <p className="mt-6">
        <Link href="/explore" className="text-flame underline underline-offset-2">See all investigations</Link>
      </p>
    </main>
  );
}
