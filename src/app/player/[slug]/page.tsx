import Link from "next/link";
import { players } from "@/data/brown";
import { espnGameLogs } from "@/data/espnGameLogs";
import { espnPlayerDerived } from "@/data/espnPlayerDerived";
import { espnShotSource } from "@/data/espnShots";
import { playerMetricGroups } from "@/data/playerMetricCatalog";
import { CourtLines } from "@/app/shot-charts/CourtLines";
import { PlayerGameLog } from "./PlayerGameLog";

function slugify(name: string) {
  return name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "");
}

function shotLeft(x: number) {
  return Math.max(2, Math.min(98, x * 2));
}

function shotTop(y: number) {
  return Math.max(2, Math.min(98, y * 2));
}

function signed(value: number) {
  return value > 0 ? `+${Number(value.toFixed(1))}` : Number(value.toFixed(1));
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

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = players.find((item) => slugify(item.name) === slug);
  const playerShots = espnShotSource.shots.filter(
    (shot) => shot.player === player?.name,
  );
  const derivedPlayer = espnPlayerDerived.players.find(
    (item) => item.player === player?.name,
  );
  const gameLogs = espnGameLogs.playerGameLogs.filter(
    (game) => game.player === player?.name,
  );

  if (!player) {
    return (
      <main className="page-shell">
        <Link
          href="/player-stats"
          className="chip-button"
        >
          Back to player stats
        </Link>
        <h1 className="mt-8 text-3xl font-bold">Player not found</h1>
      </main>
    );
  }

  const makes = playerShots.filter((shot) => shot.made).length;
  const attempts = playerShots.length;
  const fgPct = attempts > 0 ? Math.round((makes / attempts) * 100) : "TBD";

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <Link href="/player-stats" className="back-link">
          Back to player stats
        </Link>
        <a href="#game-log" className="back-link ml-2">
          Game Log
        </a>
        <p className="eyebrow mt-5">
          Brown Men&apos;s Basketball
        </p>
        <h1 className="hero-title">{player.name}</h1>
        <p className="mt-2 text-[#efe7df]">{player.position}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label="PTS" value={player.points} />
          <StatCard label="REB" value={player.rebounds} />
          <StatCard label="AST" value={player.assists} />
          <StatCard label="TS%" value={derivedPlayer ? `${derivedPlayer.tsPct.toFixed(1)}%` : player.trueShooting} />
          <StatCard label="FGA" value={derivedPlayer?.fga ?? attempts} />
          <StatCard label="3P" value={derivedPlayer ? `${derivedPlayer.threePm}/${derivedPlayer.threePa}` : player.threePointPct} />
          <StatCard label="On Net" value={derivedPlayer ? signed(derivedPlayer.onCourtNetRating) : player.netRating} />
          <StatCard label="+/-" value={derivedPlayer ? signed(derivedPlayer.plusMinus) : player.netRating} />
        </div>
      </section>

      <section id="game-log" className="panel mt-6 scroll-mt-6">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-bold">Game Log</h2>
            <p className="mt-1 text-sm text-[#6b5b50]">
              Game-by-game box score and advanced analytics from ESPN box scores,
              play-by-play, and reconstructed lineup stints.
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7566]">
            {gameLogs.length} games
          </p>
        </div>
        <PlayerGameLog games={gameLogs} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="panel">
          <h2 className="text-xl font-bold">Shot Map</h2>

          <div className="relative mt-5 aspect-square overflow-hidden rounded-lg border border-[#d8cbbb] bg-[#f0d7b8] shadow-inner">
            <CourtLines />

            {playerShots.map((shot, index) => {
              const position = shotPosition(shot, index, playerShots);

              return (
                <div
                  key={`${shot.player}-${index}`}
                  title={`${shot.zone}`}
                  className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
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

            {playerShots.length === 0 && (
              <p className="absolute inset-x-8 top-1/2 -translate-y-1/2 rounded bg-white/80 p-4 text-center text-sm text-[#6b5b50]">
                ESPN shot locations were not found for this player.
              </p>
            )}
          </div>
        </div>

        <div className="panel">
          <h2 className="text-xl font-bold">Advanced Profile</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <ProfileLine label="Minutes" value={derivedPlayer?.minutes.toFixed(1) ?? player.minutes} />
            <ProfileLine label="On-Court Poss" value={derivedPlayer?.onCourtPoss.toFixed(1) ?? "Needs data"} />
            <ProfileLine label="ORtg" value={derivedPlayer?.onCourtOffRating.toFixed(1) ?? player.offensiveRating} />
            <ProfileLine label="DRtg" value={derivedPlayer?.onCourtDefRating.toFixed(1) ?? player.defensiveRating} />
            <ProfileLine label="On/Off Net" value={derivedPlayer ? signed(derivedPlayer.onOffNet) : "Needs data"} />
            <ProfileLine label="+/- /40" value={derivedPlayer ? signed(derivedPlayer.plusMinusPer40) : "Needs data"} />
            <ProfileLine label="Shot Attempts" value={attempts} />
            <ProfileLine label="Shot Makes" value={makes} />
            <ProfileLine label="Shot FG%" value={`${fgPct}%`} />
            <ProfileLine label="Usage" value={derivedPlayer ? `${derivedPlayer.usagePct.toFixed(1)}%` : "Needs data"} />
          </div>
        </div>
      </section>

      <section className="panel mt-6">
        <h2 className="text-xl font-bold">Databallr-Style Stat Profile</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playerMetricGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-md border border-[#eee5dc] bg-[#fbf7f0] p-4 shadow-sm"
            >
              <h3 className="font-bold">{group.title}</h3>
              <div className="mt-3 space-y-2 text-sm">
                {group.metrics.slice(0, 8).map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-start justify-between gap-3 border-t border-[#eee5dc] pt-2"
                    title={metric.description}
                  >
                    <span className="text-[#6b5b50]">{metric.label}</span>
                    <span className="text-right font-semibold">
                      {metric.value(player)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
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
    <div className="rounded-lg border border-white/15 bg-white/95 p-4 text-[#24170f] shadow-sm backdrop-blur">
      <p className="stat-label">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function ProfileLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-[#eee5dc] bg-[#fbf7f0] p-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7b6b60]">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
