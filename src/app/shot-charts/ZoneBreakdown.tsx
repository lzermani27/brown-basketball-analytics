"use client";

import { useState } from "react";

type Zone = {
  zone: string;
  attempts: number;
  makes: number;
  fgPct: number;
  pointsPerShot: number;
};

type SortKey = keyof Zone;
type SortDirection = "asc" | "desc";

const labels: Record<SortKey, string> = {
  zone: "Zone",
  attempts: "Attempts",
  makes: "Makes",
  fgPct: "FG%",
  pointsPerShot: "Pts/Shot",
};

export function ZoneBreakdown({ zones }: { zones: Zone[] }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "attempts",
    direction: "desc",
  });

  const sortedZones = [...zones].sort((a, b) => {
    const aValue = a[sort.key];
    const bValue = b[sort.key];
    const result =
      typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
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
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(labels) as SortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => chooseSort(key)}
            className={`chip-button ${sort.key === key ? "chip-button-active" : ""}`}
          >
            {labels[key]} {sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sortedZones.map((zone) => (
          <div key={zone.zone} className="rounded-md border border-[#eee5dc] bg-[#fbf7f0] p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{zone.zone}</p>
              <p className="text-sm text-[#6b5b50]">
                {zone.makes}/{zone.attempts}
              </p>
            </div>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold">{zone.fgPct}%</p>
              <p className="text-sm text-[#6b5b50]">
                {zone.pointsPerShot} pts/shot
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
