"use client";

import Link from "next/link";
import { useState } from "react";
import { espnGameLogs } from "@/data/espnGameLogs";

type Game = (typeof espnGameLogs.games)[number];
type SortKey = keyof Game;
type SortDirection = "asc" | "desc";

const columns: Array<{ key: SortKey; label: string; suffix?: string }> = [
  { key: "date", label: "Date" },
  { key: "opponent", label: "Opponent" },
  { key: "homeAway", label: "H/A" },
  { key: "result", label: "Result" },
  { key: "score", label: "Score" },
  { key: "pointsFor", label: "PF" },
  { key: "pointsAgainst", label: "PA" },
  { key: "offensiveRating", label: "ORtg" },
  { key: "defensiveRating", label: "DRtg" },
  { key: "netRating", label: "Net" },
  { key: "pace", label: "Pace" },
  { key: "efgPct", label: "eFG%", suffix: "%" },
  { key: "tsPct", label: "TS%", suffix: "%" },
  { key: "turnoverRate", label: "TOV%", suffix: "%" },
  { key: "offensiveReboundRate", label: "ORB%", suffix: "%" },
  { key: "freeThrowRate", label: "FTr" },
  { key: "fgm", label: "FGM" },
  { key: "fga", label: "FGA" },
  { key: "threePm", label: "3PM" },
  { key: "threePa", label: "3PA" },
  { key: "ftm", label: "FTM" },
  { key: "fta", label: "FTA" },
  { key: "rebounds", label: "REB" },
  { key: "offensiveRebounds", label: "OREB" },
  { key: "defensiveRebounds", label: "DREB" },
  { key: "assists", label: "AST" },
  { key: "turnovers", label: "TOV" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "pointsInPaint", label: "Paint" },
  { key: "fastBreakPoints", label: "FB" },
  { key: "pointsOffTurnovers", label: "PTO" },
  { key: "largestLead", label: "Lead" },
  { key: "opponentEfgPct", label: "Opp eFG%", suffix: "%" },
  { key: "topPlayer", label: "Top Player" },
  { key: "topGameScore", label: "Top GS" },
];

function sortValue(value: string | number) {
  if (typeof value === "number") return value;
  const parsedDate = Date.parse(value);
  if (Number.isFinite(parsedDate)) return parsedDate;
  const score = value.match(/^(\d+)-(\d+)$/);
  if (score) return Number(score[1]) - Number(score[2]);
  const parsed = Number(value.replace("+", "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : value.toLowerCase();
}

function formatValue(value: string | number, suffix?: string) {
  if (typeof value === "number") return `${value}${suffix ?? ""}`;
  return value;
}

export default function GameLogPage() {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "date",
    direction: "desc",
  });

  const sortedGames = [...espnGameLogs.games].sort((a, b) => {
    const left = sortValue(a[sort.key]);
    const right = sortValue(b[sort.key]);
    const result =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return sort.direction === "asc" ? result : -result;
  });

  function chooseSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <Link href="/" className="back-link">
          Back to dashboard
        </Link>
        <p className="eyebrow mt-5">Brown Men&apos;s Basketball</p>
        <h1 className="hero-title">Game Log</h1>
        <p className="hero-copy">
          Every game from the 2025-26 season with ESPN box score stats,
          possession estimates, efficiency ratings, and play-by-play-derived
          advanced numbers.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Games" value={espnGameLogs.games.length} />
        <StatCard label="Wins" value={espnGameLogs.games.filter((game) => game.result === "W").length} />
        <StatCard label="Avg ORtg" value={average(espnGameLogs.games.map((game) => game.offensiveRating))} />
        <StatCard label="Avg Net" value={signed(average(espnGameLogs.games.map((game) => game.netRating)))} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Sortable Game Log</h2>
        <div className="table-wrap">
          <table className="w-full min-w-[2400px] border-collapse text-left text-sm">
            <thead className="table-head">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => chooseSort(column.key)}
                      className="flex items-center gap-2 font-bold"
                    >
                      {column.label}
                      <span className="text-xs text-[#f1d7b3]">
                        {sort.key === column.key
                          ? sort.direction === "asc"
                            ? "UP"
                            : "DN"
                          : "--"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedGames.map((game) => (
                <tr key={game.gameId} className="table-row">
                  {columns.map((column) => (
                    <td
                      key={`${game.gameId}-${column.key}`}
                      className={`px-4 py-3 ${
                        column.key === "opponent" || column.key === "netRating"
                          ? "font-bold"
                          : ""
                      }`}
                    >
                      {column.key === "netRating"
                        ? signed(game.netRating)
                        : formatValue(game[column.key], column.suffix)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
