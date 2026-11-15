// Without JS, React never swaps a streamed Suspense boundary in (it waits in a hidden div at the end of
// <body>). This no-JS-only stylesheet hides the fallback and shows the streamed content in its place,
// above the footer, so link- and form-driven selection gives a complete page without scripts.
// (Same technique as /compare.)
const NO_JS_CSS =
  "[data-view-fallback]{display:none}" +
  // In the base layer: Tailwind's preflight hides [hidden] with a layered !important, which an unlayered rule cannot beat.
  "@layer base{body>div[hidden][id^='S:']{display:flex!important;flex-direction:column;order:1}}" +
  "body>footer{order:2}";

/** Suspense fallback for a URL-driven view: a hero-shaped placeholder plus the no-JS stylesheet. */
export function StreamFallback({ label }: { label: string }) {
  return (
    <section data-view-fallback="" aria-busy="true" className="theater-well relative border-b border-line">
      <noscript>
        <style>{NO_JS_CSS}</style>
      </noscript>
      <div className="container-wide min-h-[22rem] pb-16 pt-20 sm:pt-28">
        <p className="type-body-l text-fg-2">{label}</p>
      </div>
    </section>
  );
}
