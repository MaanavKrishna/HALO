import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FONT_DIR = join(process.cwd(), "src/components/content/og/fonts");

// Read once at module load (build time), so the share images prerender as
// static files. Inter is self-hosted under OFL-1.1 (see fonts/OFL.txt); no
// font is ever fetched from the network.
const [regular, semibold] = await Promise.all([
  readFile(join(FONT_DIR, "Inter-Regular.ttf")),
  readFile(join(FONT_DIR, "Inter-SemiBold.ttf")),
]);

export const OG_FONTS = [
  { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const },
];
