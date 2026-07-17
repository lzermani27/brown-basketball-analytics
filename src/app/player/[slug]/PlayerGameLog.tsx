"use client";

import { useState } from "react";

type PlayerGame = {
  gameId: string;
  date: string;
  opponent: string;
  result: string;
  score: string;
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  turnovers: number;
  steals: number;
  blocks: number;
  efgPct: number;
  tsPct: number;
  usagePct: number;
  gameScore: number;
  plusMinus: number;
  plusMinusPer40: number;
  onCourtOffRating: number;
  onCourtDefRating: number;
  onCourtNetRating: number;
  onCourtPoss: number;
};

type SortKey = keyof PlayerGame;
type SortDirection = "asc" | "desc";

const columns: Array<{ key: SortKey; label: string; suffix?: string }> = [
  { key: "date", label: "Date" },
  { key: "opponent", label: "Opponent" },
  { key: "result", label: "Result" },
  { key: "score", label: "Score" },
  { key: "minutes", label: "MIN" },
  { key: "points", label: "PTS" },
  { key: "fga", label: "FGA" },
  { key: "fgm", label: "FGM" },
  { key: "threePa", label: "3PA" },
  { key: "threePm", label: "3PM" },
  { key: "fta", label: "FTA" },
  { key: "ftm", label: "FTM" },
  { key: "rebounds", label: "REB" },
  { key: "offensiveRebounds", label: "OREB" },
  { key: "defensiveRebounds", label: "DREB" },
  { key: "assists", label: "AST" },
  { key: "turnovers", label: "TOV" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "efgPct", label: "eFG%", suffix: "%" },
  { key: "tsPct", label: "TS%", suffix: "%" },
  { key: "usagePct", label: "USG%", suffix: "%" },
  { key: "gameScore", label: "Game Score" },
  { key: "plusMinus", label: "+/-" },
  { key: "plusMinusPer40", label: "+/-/40" },
  { key: "onCourtOffRating", label: "ORtg" },
  { key: "onCourtDefRating", label: "DRtg" },
  { key: "onCourtNetRating", label: "Net" },
  { key: "onCourtPoss", label: "Poss" },
];

function sortValue(value: string | number) {
  if (typeof value === "number") return value;
  const parsedDate = Date.parse(value);
  if (Number.isFinite(parsedDate)) return parsedDate;
  const parsed = Number(value.replace("+", "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : value.toLowerCase();
}

function formatValue(value: string | number, key: SortKey, suffix?: string) {
  if (typeof value !== "number") return value;
  const signed = ["plusMinus", "plusMinusPer40", "onCourtNetRating"].includes(key) && value > 0;
  return `${signed ? "+" : ""}${value}${suffix ?? ""}`;
}

export function PlayerGameLog({ games }: { games: readonly PlayerGame[] }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "date",
    direction: "desc",
  });

  const sortedGames = [...games].sort((a, b) => {
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
    <div className="table-wrap mt-4">
      <table className="w-full min-w-[2200px] border-collapse text-left text-sm">
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
                    column.key === "opponent" || column.key === "points"
                      ? "font-bold"
                      : ""
                  }`}
                >
                  {formatValue(game[column.key], column.key, column.suffix)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
