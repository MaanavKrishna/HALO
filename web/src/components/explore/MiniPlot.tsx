import type { PlotPoint } from "@/lib/explore";

const W = 520;
const H = 300;
const M = { l: 52, r: 16, t: 14, b: 44 };

function niceStep(span: number): number {
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

function axis(min: number, max: number): { lo: number; hi: number; ticks: number[] } {
  const pad = Math.max((max - min) * 0.08, 1);
  const step = niceStep(max - min + 2 * pad);
  const lo = Math.max(0, Math.floor((min - pad) / step) * step);
  const hi = Math.ceil((max + pad) / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo, hi, ticks };
}

/**
 * O2 x pressure scatter of the eligible tests of one investigation. Filled dot:
 * both conditions measured. Hollow dot: at least one inferred or assumed.
 * A data table below carries the same points for screen readers.
 */
export function MiniPlot({ points, label }: { points: PlotPoint[]; label: string }) {
  if (points.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-rule-strong p-4 text-sm text-muted">
        No test rows from this investigation count toward habitat coverage, so there is nothing to plot.
      </p>
    );
  }
  const xs = axis(Math.min(...points.map((p) => p.o2Pct)), Math.max(...points.map((p) => p.o2Pct)));
  const ys = axis(Math.min(...points.map((p) => p.pressurePsia)), Math.max(...points.map((p) => p.pressurePsia)));
  const x = (v: number) => M.l + ((v - xs.lo) / (xs.hi - xs.lo)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - ys.lo) / (ys.hi - ys.lo)) * (H - M.t - M.b);
  const nTests = points.reduce((s, p) => s + p.count, 0);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label}: ${nTests} eligible tests at ${points.length} distinct oxygen and pressure combinations. A data table follows.`}
        className="h-auto w-full max-w-[34rem]"
      >
        {ys.ticks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1" />
            <text x={M.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="var(--muted)">{t}</text>
          </g>
        ))}
        {xs.ticks.map((t) => (
          <g key={`x${t}`}>
            <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} stroke="var(--rule)" strokeWidth="1" strokeDasharray="2 4" />
            <text x={x(t)} y={H - M.b + 18} textAnchor="middle" fontSize="12" fill="var(--muted)">{t}</text>
          </g>
        ))}
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="var(--rule-strong)" />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="var(--rule-strong)" />
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize="12.5" fill="var(--ink)">Oxygen (% of atmosphere)</text>
        <text transform={`translate(13 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="12.5" fill="var(--ink)">Pressure (psia)</text>
        {points.map((p) => {
          const r = 4 + Math.min(4, Math.log2(p.count));
          return p.measured ? (
            <circle key={`${p.o2Pct}|${p.pressurePsia}`} cx={x(p.o2Pct)} cy={y(p.pressurePsia)} r={r} fill="var(--flame)" fillOpacity="0.75" stroke="var(--flame)" />
          ) : (
            <circle key={`${p.o2Pct}|${p.pressurePsia}`} cx={x(p.o2Pct)} cy={y(p.pressurePsia)} r={r} fill="var(--surface)" stroke="var(--flame)" strokeWidth="1.75" />
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--flame)" fillOpacity="0.75" stroke="var(--flame)" /></svg>
          O₂ and pressure measured
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="var(--surface)" stroke="var(--flame)" strokeWidth="1.75" /></svg>
          at least one inferred or assumed
        </span>
        <span>Dot size grows with the number of tests at that point.</span>
      </figcaption>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer rounded-sm font-semibold text-flame">Data table ({points.length} points)</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border border-rule">
          <table className="num w-full border-collapse text-left">
            <caption className="sr-only">Oxygen and pressure of each distinct test condition</caption>
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-rule">
                <th scope="col" className="px-3 py-1.5 font-semibold">O₂ (%)</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Pressure (psia)</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Tests</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Conditions</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={`${p.o2Pct}|${p.pressurePsia}`} className="border-b border-rule last:border-0">
                  <td className="px-3 py-1">{p.o2Pct}</td>
                  <td className="px-3 py-1">{p.pressurePsia}</td>
                  <td className="px-3 py-1">{p.count}</td>
                  <td className="px-3 py-1">{p.measured ? "measured" : "inferred or assumed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
