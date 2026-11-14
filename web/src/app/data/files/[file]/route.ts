import { DOWNLOADS } from "@/components/content/downloads";

/** The JSON data contract, byte-for-byte as built (prerendered at build time). */
export function generateStaticParams() {
  return DOWNLOADS.map((d) => ({ file: d.file }));
}

export async function GET(_req: Request, ctx: RouteContext<"/data/files/[file]">) {
  const { file } = await ctx.params;
  const d = DOWNLOADS.find((x) => x.file === file);
  if (!d) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(new Uint8Array(d.body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `inline; filename="${d.file}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
