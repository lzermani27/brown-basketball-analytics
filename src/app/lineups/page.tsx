import Link from "next/link";
import { players } from "@/data/brown";
import { espnLineupSource } from "@/data/espnLineups";
import { LineupExplorer } from "./LineupExplorer";

export default function LineupsPage() {
  const playerNames = players.map((player) => player.name);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <Link href="/" className="back-link">
          Back to dashboard
        </Link>
        <p className="eyebrow mt-5">
          Brown Men&apos;s Basketball
        </p>
        <h1 className="hero-title">Lineup Impact</h1>
        <p className="hero-copy">
          Select a 2-man, 3-man, or 5-man combination and view ESPN-derived
          rotation plus-minus, estimated offensive/defensive rating, net
          rating, shooting efficiency, turnover rate, and offensive rebounding.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Games Attempted" value={espnLineupSource.gamesAttempted} />
        <SummaryCard label="Games Parsed" value={espnLineupSource.gamesParsed} />
        <SummaryCard label="2-Man Combos" value={espnLineupSource.lineups2Man.length} />
        <SummaryCard label="5-Man Lineups" value={espnLineupSource.lineups5Man.length} />
      </section>

      <LineupExplorer
        players={playerNames}
        lineups2Man={espnLineupSource.lineups2Man}
        lineups3Man={espnLineupSource.lineups3Man}
        lineups5Man={espnLineupSource.lineups5Man}
      />

      <section className="panel mt-8">
        <h2 className="text-xl font-bold">Method Notes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#6b5b50]">
          <li>Starters come from ESPN box score starter flags.</li>
          <li>Lineup changes come from ESPN play-by-play substitution events.</li>
          <li>Plus-minus is calculated from score changes during each stint.</li>
          <li>
            OFF and DEF are estimated points per 100 possessions using
            possession estimates: FGA + 0.44 * FTA + TOV - ORB.
          </li>
          <li>
            These are public-data estimates. Brown&apos;s internal official
            substitution and possession data would be the final source of truth.
          </li>
        </ul>
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
      <p className="stat-value">{value}</p>
    </div>
  );
}
