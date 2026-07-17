import Link from "next/link";
import { espnShotSource } from "@/data/espnShots";
import { CourtLines } from "./CourtLines";
import { ZoneBreakdown } from "./ZoneBreakdown";

type SearchParams = Promise<{ player?: string }>;

function pct(makes: number, attempts: number) {
  return attempts ? Math.round((makes / attempts) * 1000) / 10 : 0;
}

function playerSlug(name: string) {
  return name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "");
}

function shotLeft(x: number) {
  return Math.max(2, Math.min(98, x * 2));
}

function shotTop(y: number) {
  return Math.max(2, Math.min(98, y * 2));
}

function shotPosition(
  shot: { x: number; y: number },
  index: number,
  allShots: ReadonlyArray<{ x: number; y: number }>,
) {
  const overlapIndex = allShots
    .slice(0, index)
    .filter((item) => item.x === shot.x && item.y === shot.y).length;
  const offsets = [
    [0, 0],
    [1.1, 0],
    [-1.1, 0],
    [0, 1.1],
    [0, -1.1],
    [0.8, 0.8],
    [-0.8, -0.8],
  ];
  const [dx, dy] = offsets[overlapIndex % offsets.length];

  return {
    left: Math.max(2, Math.min(98, shotLeft(shot.x) + dx)),
    top: Math.max(2, Math.min(98, shotTop(shot.y) + dy)),
  };
}

export default async function ShotChartsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { player } = await searchParams;
  const selected =
    espnShotSource.players.find((item) => playerSlug(item.player) === player)
      ?.player ?? "Team";
  const shots =
    selected === "Team"
      ? espnShotSource.shots
      : espnShotSource.shots.filter((shot) => shot.player === selected);
  const summary =
    selected === "Team"
      ? espnShotSource.team
      : espnShotSource.players.find((item) => item.player === selected);

  const zones = [...new Set(shots.map((shot) => shot.zone))]
    .map((zone) => {
      const zoneShots = shots.filter((shot) => shot.zone === zone);
      const makes = zoneShots.filter((shot) => shot.made).length;
      const points = zoneShots.reduce((sum, shot) => sum + shot.pointsScored, 0);
      return {
        zone,
        attempts: zoneShots.length,
        makes,
        fgPct: pct(makes, zoneShots.length),
        pointsPerShot: zoneShots.length
          ? Math.round((points / zoneShots.length) * 100) / 100
          : 0,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <Link href="/" className="back-link">
          Back to dashboard
        </Link>
        <p className="eyebrow mt-5">
          Brown Men&apos;s Basketball
        </p>
        <h1 className="hero-title">Shot Charts</h1>
        <p className="hero-copy">
          ESPN shot coordinates cleaned into non-overlapping zones: paint, mid
          range, both corners, both wings, and top of key.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="View" value={selected} />
        <SummaryCard label="FGA" value={summary?.attempts ?? 0} />
        <SummaryCard label="FG%" value={`${summary?.fgPct ?? 0}%`} />
        <SummaryCard label="Points / Shot" value={summary?.pointsPerShot ?? 0} />
      </section>

      <section className="panel mt-6">
        <h2 className="text-xl font-bold">Player Filter</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterLink active={selected === "Team"} href="/shot-charts">
            Team
          </FilterLink>
          {espnShotSource.players.map((item) => (
            <FilterLink
              key={item.player}
              active={selected === item.player}
              href={`/shot-charts?player=${playerSlug(item.player)}`}
            >
              {item.player}
            </FilterLink>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel">
          <h2 className="text-xl font-bold">Court Map</h2>

          <div className="relative mt-5 aspect-square overflow-hidden rounded-lg border border-[#d8cbbb] bg-[#f0d7b8] shadow-inner">
            <CourtLines />

            {shots.map((shot, index) => {
              const position = shotPosition(shot, index, shots);

              return (
                <div
                  key={shot.id}
                  title={`${shot.player} - ${shot.zone} - ${shot.text}`}
                  className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                    shot.made
                      ? "border-[#1f7a3f] bg-[#35b365]"
                      : "border-[#9b1c1c] bg-white"
                  }`}
                  style={{
                    left: `${position.left}%`,
                    top: `${position.top}%`,
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="panel">
          <h2 className="text-xl font-bold">Zone Percentages</h2>
          <ZoneBreakdown zones={zones} />
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#26170f]">{value}</p>
    </div>
  );
}

function FilterLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`chip-button ${active ? "chip-button-active" : ""}`}
    >
      {children}
    </Link>
  );
}
