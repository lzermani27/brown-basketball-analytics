"use client";

import { useMemo, useState } from "react";

type LineupRow = {
  players: string;
  type: string;
  minutes: number;
  stints: number;
  plusMinus: number;
  plusMinusPer40: number;
  offRating: number;
  defRating: number;
  netRating: number;
  offTsPct: number;
  offTovPct: number;
  offOrbPct: number;
  defTsPct: number;
  defTovPct: number;
  defOrbPct: number;
};

type Props = {
  players: string[];
  lineups2Man: readonly LineupRow[];
  lineups3Man: readonly LineupRow[];
  lineups5Man: readonly LineupRow[];
};

type SortDirection = "asc" | "desc";
type SortKey = keyof LineupRow;

const modeMap = {
  2: "lineups2Man",
  3: "lineups3Man",
  5: "lineups5Man",
} as const;

export function LineupExplorer({
  players,
  lineups2Man,
  lineups3Man,
  lineups5Man,
}: Props) {
  const [size, setSize] = useState<2 | 3 | 5>(3);
  const [selected, setSelected] = useState<string[]>([]);
  const [includeAllLineups, setIncludeAllLineups] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "minutes",
    direction: "desc",
  });

  const data = { lineups2Man, lineups3Man, lineups5Man };
  const activeRows = data[modeMap[size]];
  const sampleRows = includeAllLineups
    ? activeRows
    : activeRows.filter((row) => row.minutes >= 50);
  const selectedKey = [...selected].sort((a, b) => a.localeCompare(b)).join(" / ");
  const filteredRows =
    selected.length > 0
      ? sampleRows.filter((row) => {
          const rowPlayers = row.players.split(" / ");
          return selected.every((player) => rowPlayers.includes(player));
        })
      : sampleRows;
  const exactMatch =
    selected.length === size
      ? sampleRows.find((row) => row.players === selectedKey)
      : undefined;
  const sortedRows = [...filteredRows].sort((a, b) => {
    const aValue = a[sort.key];
    const bValue = b[sort.key];
    const result =
      typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
    return sort.direction === "asc" ? result : -result;
  });
  const tableRows = sortedRows.slice(0, visibleCount);
  const tableTitle =
    selected.length > 0
      ? `${size}-Man Combos With ${selected.join(" / ")}`
      : `Top ${size}-Man Combos`;

  const availablePlayers = useMemo(
    () =>
      [...players].sort((a, b) => {
        const aSelected = selected.includes(a) ? -1 : 0;
        const bSelected = selected.includes(b) ? -1 : 0;
        return aSelected - bSelected || a.localeCompare(b);
      }),
    [players, selected],
  );

  function chooseSize(nextSize: 2 | 3 | 5) {
    setVisibleCount(25);
    setSize(nextSize);
    setSelected((current) => current.slice(0, nextSize));
  }

  function togglePlayer(player: string) {
    setVisibleCount(25);
    setSelected((current) => {
      if (current.includes(player)) {
        return current.filter((item) => item !== player);
      }
      if (current.length >= size) {
        return [...current.slice(1), player];
      }
      return [...current, player];
    });
  }

  return (
    <>
      <section className="panel mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Lineup Builder</h2>
            <p className="mt-1 text-sm text-[#6b5b50]">
              Pick any player first to see every lineup that includes him, then
              keep adding players to narrow the list. Min. 50 minutes played by
              default.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setVisibleCount(25);
                setIncludeAllLineups((current) => !current);
              }}
              className={`chip-button ${includeAllLineups ? "chip-button-active" : ""}`}
            >
              Include all lineups
            </button>
            <div className="flex rounded-lg border border-[#d8cec3] bg-[#f4ede4] p-1 shadow-inner">
              {[2, 3, 5].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseSize(option as 2 | 3 | 5)}
                  className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                    size === option
                      ? "bg-[#3b2418] text-white shadow-sm"
                      : "text-[#4e3629] hover:bg-white"
                  }`}
                >
                  {option}-Man
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {availablePlayers.map((player) => {
            const active = selected.includes(player);
            return (
              <button
                key={player}
                type="button"
                onClick={() => togglePlayer(player)}
                className={`chip-button ${
                  active
                    ? "chip-button-active"
                    : ""
                }`}
              >
                {player}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#6b5b50]">
          <span>
            Selected {selected.length}/{size}:{" "}
            <strong className="text-[#2b1b12]">
              {selected.length ? selected.join(" / ") : "None"}
            </strong>
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setVisibleCount(25);
                setSelected([]);
              }}
              className="chip-button px-3 py-1"
            >
              Clear
            </button>
          )}
          {selected.length === size && !exactMatch && (
            <span className="font-semibold text-[#9b1c1c]">
              No recorded minutes for that exact combo.
            </span>
          )}
          {tableRows.length > 0 && (
            <span>
              Showing <strong className="text-[#2b1b12]">{tableRows.length}</strong>{" "}
              of {filteredRows.length} {selected.length > 0 ? "matching" : "eligible"} lineups.
            </span>
          )}
          {!includeAllLineups && (
            <span className="rounded bg-[#f4e5c9] px-2 py-1 text-xs font-bold text-[#4e3629]">
              50+ MIN filter on
            </span>
          )}
        </div>
      </section>

      <LineupTable
        title={exactMatch ? "Selected Exact Lineup" : tableTitle}
        rows={tableRows}
        sort={sort}
        onSort={(key) =>
          {
            setVisibleCount(25);
          setSort((current) => ({
            key,
            direction:
              current.key === key && current.direction === "desc"
                ? "asc"
                : "desc",
          }));
          }
        }
      />
      {visibleCount < sortedRows.length && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 25)}
            className="chip-button"
          >
            View more ({Math.min(25, sortedRows.length - visibleCount)} more)
          </button>
        </div>
      )}
    </>
  );
}

const columns: Array<{ key: SortKey; label: string; suffix?: string }> = [
  { key: "players", label: "Lineup" },
  { key: "minutes", label: "MIN" },
  { key: "offRating", label: "OFF" },
  { key: "defRating", label: "DEF" },
  { key: "netRating", label: "NET" },
  { key: "plusMinus", label: "+/-" },
  { key: "plusMinusPer40", label: "+/- /40" },
  { key: "offTsPct", label: "OFF TS%", suffix: "%" },
  { key: "offTovPct", label: "OFF TOV%", suffix: "%" },
  { key: "offOrbPct", label: "OFF ORB%", suffix: "%" },
  { key: "defTsPct", label: "DEF TS%", suffix: "%" },
  { key: "defTovPct", label: "DEF TOV%", suffix: "%" },
  { key: "defOrbPct", label: "DEF ORB%", suffix: "%" },
];

function LineupTable({
  title,
  rows,
  sort,
  onSort,
}: {
  title: string;
  rows: LineupRow[];
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      <div className="table-wrap">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="table-head">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="flex items-center gap-2 font-bold"
                  >
                    {column.label}
                    <span className="text-xs text-[#f1d7b3]">
                      {sort.key === column.key
                        ? sort.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.players} className="table-row">
                {columns.map((column) => (
                  <td
                    key={`${row.players}-${column.key}`}
                    className={`px-4 py-3 ${
                      column.key === "players" || column.key === "netRating"
                        ? "font-bold"
                        : ""
                    }`}
                  >
                    {formatValue(row[column.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length === 0 && (
            <tbody>
              <tr>
                <td className="px-4 py-6 text-center text-[#6b5b50]" colSpan={13}>
                  No recorded lineup minutes match that selection.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </section>
  );
}

function formatValue(
  value: string | number,
  column: { key: SortKey; suffix?: string },
) {
  if (typeof value === "number") {
    const signed =
      ["netRating", "plusMinus", "plusMinusPer40"].includes(column.key) &&
      value > 0;
    return `${signed ? "+" : ""}${value}${column.suffix ?? ""}`;
  }
  return value;
}
