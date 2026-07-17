import Link from "next/link";
import { games, players, teamSummary } from "@/data/brown";
import { espnLineupSource } from "@/data/espnLineups";

export default function Home() {
  const latestGame = games[0];
  const topLineups = espnLineupSource.lineups5Man
    .filter((lineup) => lineup.minutes >= 2)
    .slice(0, 3);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">
          Brown Men&apos;s Basketball
        </p>
        <h1 className="hero-title">Basketball Analytics Hub</h1>
        <p className="hero-copy">
          Real public stats from Sports Reference, ESPN, Brown Athletics, and
          ESPN play-by-play lineup reconstruction.
        </p>
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-4">
        <Link href="/team-stats">
          <StatCard label="Offensive Rating" value={teamSummary.offensiveRating} />
        </Link>
        <Link href="/team-stats">
          <StatCard label="Defensive Rating" value={teamSummary.defensiveRating} />
        </Link>
        <Link href="/team-stats">
          <StatCard label="Net Rating" value={`+${teamSummary.netRating}`} />
        </Link>
        <Link href="/team-stats">
          <StatCard label="Record" value={teamSummary.record} />
        </Link>
      </section>

      <section className="grid gap-6 pb-8 lg:grid-cols-3">
        <DashboardCard title="Player Advanced" href="/player-stats">
          <div className="mt-4 space-y-3">
            {players.slice(0, 5).map((player) => (
              <div
                key={player.name}
                className="grid grid-cols-4 gap-3 border-t border-[#eee5dc] py-3 text-sm transition hover:bg-[#fbf4e7]"
              >
                <p className="font-semibold">{player.name}</p>
                <p>PTS {player.points}</p>
                <p>TS% {player.trueShooting}</p>
                <p>
                  Net {player.netRating > 0 ? "+" : ""}
                  {player.netRating}
                </p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Lineup Impact" href="/lineups">
          <div className="mt-4 space-y-3">
            {topLineups.map((lineup) => (
              <div
                key={lineup.players}
                className="border-t border-[#eee5dc] py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{lineup.players}</p>
                  <p className="rounded-md bg-[#f4e5c9] px-2 py-1 text-xs font-bold text-[#4e3629]">
                    {lineup.type}
                  </p>
                </div>
                <p className="mt-2 text-[#6b5b50]">
                  {lineup.minutes} min - PM {lineup.plusMinus > 0 ? "+" : ""}
                  {lineup.plusMinus} - PM/40{" "}
                  {lineup.plusMinusPer40 > 0 ? "+" : ""}
                  {lineup.plusMinusPer40}
                </p>
              </div>
            ))}
            {topLineups.length === 0 && (
              <p className="border-t border-[#eee5dc] pt-4 text-sm text-[#6b5b50]">
                Run the ESPN lineup pipeline to populate rotation plus-minus.
              </p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Shot Charts" href="/shot-charts">
          <div className="mt-4 rounded-lg border border-[#d8cec3] bg-[#f3dfc6] p-4 shadow-inner">
            <div className="relative h-56 rounded border-2 border-[#4e3629]">
              <div className="absolute left-1/2 top-4 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-[#4e3629]" />
              <div className="absolute left-1/2 top-14 h-20 w-28 -translate-x-1/2 border-2 border-[#4e3629]" />
              <div className="absolute left-[15%] top-0 h-32 w-[70%] rounded-b-full border-2 border-t-0 border-[#4e3629]" />
            </div>
          </div>
          <p className="mt-3 text-sm text-[#6b5b50]">
            Public sites do not include reliable Brown shot coordinates. This
            page is ready for Synergy, Hudl, or StatCrew shot exports.
          </p>
        </DashboardCard>

        <DashboardCard title="Game Log" href="/game-log">
          <div className="mt-4 border-t border-[#eee5dc] pt-4">
            <p className="text-sm text-[#6b5b50]">{latestGame.date}</p>
            <h3 className="mt-1 text-2xl font-bold">
              Brown vs {latestGame.opponent}
            </h3>
            <p className="mt-2 text-lg font-semibold">
              {latestGame.result} {latestGame.score}
            </p>
            <p className="mt-3 text-sm text-[#6b5b50]">
              ORtg {latestGame.offensiveRating} - DRtg{" "}
              {latestGame.defensiveRating} - Pace {latestGame.pace}
            </p>
          </div>
        </DashboardCard>
      </section>
    </main>
  );
}

function DashboardCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link
          href={href}
          className="rounded-md bg-[#f4e5c9] px-3 py-2 text-sm font-bold text-[#4e3629] transition hover:bg-[#e8c57b]"
        >
          View all
        </Link>
      </div>
      {children}
    </div>
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
