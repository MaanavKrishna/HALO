"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FuelClass, Hazard, Investigation } from "@/lib/engine/types";
import {
  FUEL_LABEL, FUEL_ORDER, HAZARD_LABEL, HAZARD_ORDER, filterInvestigations, formatRange, sortInvestigations,
  type Filters, type SortDir, type SortKey,
} from "@/lib/explore";

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: "acronym", label: "Investigation" },
  { key: "hardware", label: "Hardware" },
  { key: "o2", label: "O₂ range", numeric: true },
  { key: "pressure", label: "Pressure range", numeric: true },
  { key: "rows", label: "Rows", numeric: true },
  { key: "pubs", label: "Pubs", numeric: true },
];

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {items.map((t) => (
        <li key={t} className="rounded-sm border border-rule bg-surface px-1.5 py-0.5 text-xs leading-tight">
          {t}
        </li>
      ))}
    </ul>
  );
}

const fuels = (i: Investigation) => i.fuelClasses.map((f) => FUEL_LABEL[f]);
const hazards = (i: Investigation) => i.hazards.map((h) => HAZARD_LABEL[h]);

export function InvestigationTable({ investigations }: { investigations: Investigation[] }) {
  const [filters, setFilters] = useState<Filters>({ hazard: "all", fuel: "all" });
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "acronym", dir: "asc" });

  const rows = useMemo(
    () => sortInvestigations(filterInvestigations(investigations, filters), sort.key, sort.dir),
    [investigations, filters, sort],
  );

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "acronym" || key === "hardware" ? "asc" : "desc" }));

  return (
    <div>
      <div className="grid grid-cols-2 items-end gap-x-3 gap-y-3 border-b border-rule pb-4 sm:flex sm:flex-wrap sm:gap-x-5">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Hazard
          <select
            className="field-input !w-full min-w-0 font-normal sm:!w-auto sm:min-w-44"
            value={filters.hazard}
            onChange={(e) => setFilters((f) => ({ ...f, hazard: e.target.value as Hazard | "all" }))}
          >
            <option value="all">All hazards</option>
            {HAZARD_ORDER.map((h) => (
              <option key={h} value={h}>{HAZARD_LABEL[h]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Fuel class
          <select
            className="field-input !w-full min-w-0 font-normal sm:!w-auto sm:min-w-44"
            value={filters.fuel}
            onChange={(e) => setFilters((f) => ({ ...f, fuel: e.target.value as FuelClass | "all" }))}
          >
            <option value="all">All fuel classes</option>
            {FUEL_ORDER.map((f) => (
              <option key={f} value={f}>{FUEL_LABEL[f]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold md:hidden">
          Sort by
          <select
            className="field-input !w-full min-w-0 font-normal sm:!w-auto sm:min-w-44"
            value={sort.key}
            onChange={(e) => toggle(e.target.value as SortKey)}
          >
            {COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </label>
        {(filters.hazard !== "all" || filters.fuel !== "all") && (
          <button
            type="button"
            onClick={() => setFilters({ hazard: "all", fuel: "all" })}
            className="rounded-sm px-2 py-2 text-sm text-flame underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
        <p className="num col-span-2 text-sm text-muted sm:ml-auto" role="status" aria-live="polite">
          Showing {rows.length} of {investigations.length} investigations
        </p>
      </div>

      {rows.length === 0 && (
        <p className="py-10 text-muted">No investigation matches both filters. Clear a filter to see more.</p>
      )}

      {/* Wide screens: sortable table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">NASA PSI combustion investigations covered by HALO</caption>
          <thead>
            <tr className="border-b-2 border-ink align-bottom">
              {COLUMNS.slice(0, 2).map((c) => (
                <SortHeader key={c.key} col={c} sort={sort} onSort={toggle} />
              ))}
              <th scope="col" className="px-2 py-2 font-semibold">Fuel classes</th>
              <th scope="col" className="px-2 py-2 font-semibold">Hazards</th>
              {COLUMNS.slice(2).map((c) => (
                <SortHeader key={c.key} col={c} sort={sort} onSort={toggle} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.psiId} className="border-b border-rule align-top hover:bg-flame-soft/50">
                <th scope="row" className="px-2 py-3 font-normal">
                  <Link href={`/explore/${i.psiId}`} prefetch={false} className="font-semibold text-flame underline-offset-2 hover:underline">
                    {i.acronym}
                  </Link>
                  <div className="num font-mono text-xs text-muted">{i.psiId}</div>
                </th>
                <td className="max-w-[16rem] px-2 py-3 text-muted">
                  <span className="line-clamp-2" title={i.hardware}>{i.hardware || "not tabulated"}</span>
                </td>
                <td className="px-2 py-3">{i.fuelClasses.length ? <Tags items={fuels(i)} /> : <span className="text-muted">none</span>}</td>
                <td className="px-2 py-3">{i.hazards.length ? <Tags items={hazards(i)} /> : <span className="text-muted">none</span>}</td>
                <td className="num whitespace-nowrap px-2 py-3 text-right">{formatRange(i.o2Range, "%")}</td>
                <td className="num whitespace-nowrap px-2 py-3 text-right">{formatRange(i.pRangePsia, "psia")}</td>
                <td className="num px-2 py-3 text-right">{i.nRows}</td>
                <td className="num px-2 py-3 text-right">{i.publications.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: cards */}
      <ul className="grid gap-3 pt-4 md:hidden">
        {rows.map((i) => (
          <li key={i.psiId} className="rounded-md border border-rule bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <Link href={`/explore/${i.psiId}`} prefetch={false} className="text-base font-semibold text-flame underline-offset-2 hover:underline">
                {i.acronym}
              </Link>
              <span className="num font-mono text-xs text-muted">{i.psiId}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{i.hardware || "Hardware not tabulated"}</p>
            <div className="mt-3 flex flex-col gap-2">
              {i.fuelClasses.length > 0 && <Tags items={fuels(i)} />}
              {i.hazards.length > 0 && <Tags items={hazards(i)} />}
            </div>
            <dl className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-rule pt-3 text-sm">
              <dt className="text-muted">O₂</dt><dd>{formatRange(i.o2Range, "%")}</dd>
              <dt className="text-muted">Pressure</dt><dd>{formatRange(i.pRangePsia, "psia")}</dd>
              <dt className="text-muted">Rows</dt><dd>{i.nRows}</dd>
              <dt className="text-muted">Publications</dt><dd>{i.publications.length}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SortHeader({
  col, sort, onSort,
}: { col: (typeof COLUMNS)[number]; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void }) {
  const active = sort.key === col.key;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-2 py-2 font-semibold ${col.numeric ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(col.key)}
        className={`inline-flex items-center gap-1 rounded-sm font-semibold hover:text-flame ${active ? "text-flame" : ""}`}
      >
        {col.label}
        <span aria-hidden="true" className="w-3 text-xs">{active ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}
