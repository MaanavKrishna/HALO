import { DOWNLOADS, investigationCsv, testsCsvFile } from "@/components/content/downloads";
import { HALO_DATA } from "@/lib/data/load";

/**
 * The data contract, byte-for-byte as built (prerendered at build time), plus
 * tests.csv narrowed to each investigation that has eligible rows.
 */
const PER_INVESTIGATION = HALO_DATA.investigations
  .map((i) => ({ file: testsCsvFile(i.psiId), body: investigationCsv(i.psiId) }))
  .filter((x): x is { file: string; body: string } => x.body !== null);

export function generateStaticParams() {
  return [...DOWNLOADS.map((d) => ({ file: d.file })), ...PER_INVESTIGATION.map((d) => ({ file: d.file }))];
}

const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(_req: Request, ctx: RouteContext<"/data/files/[file]">) {
  const { file } = await ctx.params;
  const d = DOWNLOADS.find((x) => x.file === file);
  if (d) {
    return new Response(new Uint8Array(d.body), {
      headers: {
        "Content-Type": d.contentType,
        "Content-Disposition": `inline; filename="${d.file}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
  const one = PER_INVESTIGATION.find((x) => x.file === file);
  if (!one) return notFound();
  return new Response(one.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${one.file}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
