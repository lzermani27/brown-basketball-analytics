import Link from "next/link";
import { teamSummary } from "@/data/brown";

const overviewStats = [
  { label: "Record", value: teamSummary.record },
  { label: "Conference Record", value: teamSummary.conferenceRecord },
  { label: "SRS", value: teamSummary.srs },
  { label: "SOS", value: teamSummary.sos },
];

const efficiencyStats = [
  { label: "Offensive Rating", value: teamSummary.offensiveRating },
  { label: "Defensive Rating", value: teamSummary.defensiveRating },
  { label: "Net Rating", value: `+${teamSummary.netRating}` },
  { label: "Points Per Game", value: teamSummary.pointsPerGame },
  { label: "Points Allowed Per Game", value: teamSummary.pointsAllowedPerGame },
  { label: "Pace", value: teamSummary.pace },
];

const factorStats = [
  { label: "eFG%", value: teamSummary.efg },
  { label: "Turnover Rate", value: teamSummary.turnoverRate },
  { label: "Offensive Rebound Rate", value: teamSummary.offensiveReboundRate },
  { label: "Free Throw Rate", value: teamSummary.freeThrowRate },
  { label: "Opponent eFG%", value: "Needs opponent box scores" },
  { label: "Opponent TOV%", value: "Needs opponent box scores" },
  { label: "Defensive Rebound Rate", value: "Needs opponent box scores" },
];

const sixFactorPlaceholders = [
  "oTS - offense from shooting",
  "oTOV - offense from turnovers",
  "oORB - offense from offensive rebounding",
  "dTS - defense from opponent shooting",
  "dTOV - defense from forced turnovers",
  "dDRB - defense from ending possessions",
];

export default function TeamStatsPage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <Link href="/" className="back-link">
          Back to dashboard
        </Link>
        <p className="eyebrow mt-5">
          Brown Men&apos;s Basketball
        </p>
        <h1 className="hero-title">Team Stats</h1>
        <p className="hero-copy">
          Team-level Databallr-style dashboard using public Brown data where
          possible. Six-factor and opponent-adjusted splits are scaffolded for
          when full box-score or play-by-play files are added.
        </p>
      </section>

      <StatGrid title="Overview" stats={overviewStats} />
      <StatGrid title="Efficiency" stats={efficiencyStats} />
      <StatGrid title="Four Factors / Data Needed" stats={factorStats} />

      <section className="panel mt-8">
        <h2 className="text-xl font-bold">Six Factor Analysis</h2>
        <p className="mt-2 text-sm text-[#6b5b50]">
          This matches the style of Databallr&apos;s team analysis, but these
          components need full team and opponent box-score data to calculate
          responsibly.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sixFactorPlaceholders.map((stat) => (
            <div
              key={stat}
              className="rounded-md border border-[#eee5dc] bg-[#fbf7f0] p-3 text-sm font-bold text-[#4e3629]"
            >
              {stat}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatGrid({
  title,
  stats,
}: {
  title: string;
  stats: Array<{ label: string; value: string | number }>;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card"
          >
            <p className="stat-label">{stat.label}</p>
            <p className="mt-2 text-2xl font-black text-[#26170f]">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
