"use client";

import Link from "next/link";
import { useState } from "react";
import { players } from "@/data/brown";
import { playerMetricGroups } from "@/data/playerMetricCatalog";

function slugify(name: string) {
  return name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "");
}

type SortDirection = "asc" | "desc";
type SortState = {
  group: string;
  column: number | "player";
  direction: SortDirection;
} | null;

function sortValue(value: string | number) {
  if (typeof value === "number") return value;
  const cleaned = value.replace("%", "").replace("+", "").replace("Needs data", "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && cleaned.trim() !== ""
    ? parsed
    : value.toLowerCase();
}

export default function PlayerStatsPage() {
  const [sort, setSort] = useState<SortState>(null);

  function chooseSort(group: string, column: number | "player") {
    setSort((current) => {
      if (current?.group === group && current.column === column) {
        return {
          group,
          column,
          direction: current.direction === "desc" ? "asc" : "desc",
        };
      }
      return { group, column, direction: "desc" };
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <Link href="/" className="back-link">
          Back to dashboard
        </Link>
        <p className="eyebrow mt-5">
          Brown Men&apos;s Basketball
        </p>
        <h1 className="hero-title">Player Stats</h1>
        <p className="hero-copy">
          Databallr-style tables powered by Brown public stats, ESPN
          play-by-play, shot coordinates, and reconstructed lineup stints.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Players" value={players.length} />
        <StatCard label="ESPN Games Parsed" value="27" />
        <StatCard label="Derived Groups" value="7" />
        <StatCard label="Metric Groups" value={playerMetricGroups.length} />
      </section>

      <nav className="mt-6 flex flex-wrap gap-2">
        {playerMetricGroups.map((group) => (
          <a
            key={group.title}
            href={`#${group.title.toLowerCase().replaceAll(" ", "-")}`}
            className="chip-button"
          >
            {group.title}
          </a>
        ))}
      </nav>

      {playerMetricGroups.map((group) => (
        <section key={group.title} id={group.title.toLowerCase().replaceAll(" ", "-")} className="mt-8 scroll-mt-6">
          <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-bold">{group.title}</h2>
              <p className="mt-1 text-sm text-[#6b5b50]">{group.note}</p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7566]">
              {group.metrics.length} metrics
            </p>
          </div>
          <div className="table-wrap">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="sticky left-0 z-10 bg-[#3b2418] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => chooseSort(group.title, "player")}
                      className="flex items-center gap-2 font-bold"
                    >
                      Player
                      <SortMark active={sort?.group === group.title && sort.column === "player"} direction={sort?.direction} />
                    </button>
                  </th>
                  {group.metrics.map((metric, index) => (
                    <th
                      key={`${metric.label}-${index}`}
                      className="px-4 py-3"
                      title={metric.description}
                    >
                      <button
                        type="button"
                        onClick={() => chooseSort(group.title, index)}
                        className="flex items-center gap-2 font-bold"
                      >
                        {metric.label}
                        <SortMark active={sort?.group === group.title && sort.column === index} direction={sort?.direction} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...players]
                  .sort((a, b) => {
                    if (sort?.group !== group.title) return 0;
                    const aValue =
                      sort.column === "player"
                        ? a.name
                        : group.metrics[sort.column].value(a);
                    const bValue =
                      sort.column === "player"
                        ? b.name
                        : group.metrics[sort.column].value(b);
                    const left = sortValue(aValue);
                    const right = sortValue(bValue);
                    const result =
                      typeof left === "number" && typeof right === "number"
                        ? left - right
                        : String(left).localeCompare(String(right));
                    return sort.direction === "asc" ? result : -result;
                  })
                  .map((player) => (
                  <tr key={player.name} className="table-row">
                    <td className="sticky left-0 z-10 bg-[#fffdf9] px-4 py-3 font-semibold">
                      <Link
                        href={`/player/${slugify(player.name)}`}
                        className="font-bold text-[#4e3629] underline decoration-[#c9973f] decoration-2 underline-offset-4"
                      >
                        {player.name}
                      </Link>
                      <Link
                        href={`/player/${slugify(player.name)}#game-log`}
                        className="ml-3 rounded bg-[#f4e5c9] px-2 py-1 text-xs font-bold text-[#4e3629]"
                      >
                        Game Log
                      </Link>
                    </td>
                    {group.metrics.map((metric, index) => (
                      <td
                        key={`${player.name}-${metric.label}-${index}`}
                        className="max-w-[180px] px-4 py-3 align-top"
                        title={metric.description}
                      >
                        {metric.value(player)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}

function SortMark({
  active,
  direction,
}: {
  active: boolean;
  direction?: SortDirection;
}) {
  return (
    <span className="text-xs text-[#f1d7b3]">
      {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
