import { players } from "@/data/brown";
import { espnPlayerDerived } from "@/data/espnPlayerDerived";
import { espnShotSource } from "@/data/espnShots";

type Player = (typeof players)[number];
type DerivedPlayer = (typeof espnPlayerDerived.players)[number];

type Metric = {
  label: string;
  description: string;
  value: (player: Player) => string | number;
};

export type MetricGroup = {
  title: string;
  note: string;
  metrics: Metric[];
};

const needs = (source: string) => `Needs ${source}`;
const derived = (player: Player) =>
  espnPlayerDerived.players.find((item) => item.player === player.name);
const number = (value: number | undefined, digits = 1) =>
  value === undefined ? "Needs data" : Number(value.toFixed(digits));
const pct = (value: number | undefined) =>
  value === undefined ? "Needs data" : `${value.toFixed(1)}%`;
const plus = (value: number | undefined) => {
  if (value === undefined) return "Needs data";
  return value > 0 ? `+${number(value)}` : number(value);
};
const dValue = (
  player: Player,
  getter: (stats: DerivedPlayer) => string | number,
) => {
  const stats = derived(player);
  return stats ? getter(stats) : "Needs data";
};
const playerShots = (player: Player) =>
  espnShotSource.shots.filter((shot) => shot.player === player.name);
const zoneShots = (player: Player, zones: string[]) =>
  playerShots(player).filter((shot) => zones.includes(shot.zone));
const attempts = (shots: ReadonlyArray<{ made: boolean }>) => shots.length;
const fgPct = (shots: ReadonlyArray<{ made: boolean }>) => {
  if (!shots.length) return "0.0%";
  const makes = shots.filter((shot) => shot.made).length;
  return `${((makes / shots.length) * 100).toFixed(1)}%`;
};
const tsAdd = (stats: DerivedPlayer) => {
  const teamTs = espnPlayerDerived.players.reduce(
    (sum, player) => sum + player.points,
    0,
  ) /
    (2 *
      espnPlayerDerived.players.reduce(
        (sum, player) => sum + player.trueShotAttempts,
        0,
      ));
  return number(stats.points - 2 * stats.trueShotAttempts * teamTs);
};

export const playerMetricGroups: MetricGroup[] = [
  {
    title: "Overview",
    note: "Role, public box-score averages, and ESPN-derived season totals.",
    metrics: [
      { label: "POS", description: "Listed position", value: (p) => p.position },
      { label: "G", description: "Games played", value: (p) => p.games },
      { label: "MIN/G", description: "Minutes per game", value: (p) => p.minutes },
      { label: "MIN", description: "ESPN stint minutes", value: (p) => dValue(p, (d) => number(d.minutes)) },
      { label: "PTS/G", description: "Points per game", value: (p) => p.points },
      { label: "PTS", description: "Points from ESPN shots and free throws", value: (p) => dValue(p, (d) => d.points) },
      { label: "REB", description: "Rebounds per game", value: (p) => p.rebounds },
      { label: "AST", description: "Assists per game", value: (p) => p.assists },
      { label: "STL", description: "Steals per game", value: (p) => p.steals },
      { label: "BLK", description: "Blocks per game", value: (p) => p.blocks },
      { label: "TOV", description: "Turnovers per game", value: (p) => p.turnovers },
    ],
  },
  {
    title: "Shooting",
    note: "Shot chart zones plus ESPN-derived shooting splits.",
    metrics: [
      { label: "FGM", description: "Field goals made", value: (p) => dValue(p, (d) => d.fgm) },
      { label: "FGA", description: "Field goal attempts", value: (p) => dValue(p, (d) => d.fga) },
      { label: "FG%", description: "Field goal percentage", value: (p) => p.fieldGoalPct },
      { label: "2PM", description: "Two-point field goals made", value: (p) => dValue(p, (d) => d.twoPm) },
      { label: "2PA", description: "Two-point field goal attempts", value: (p) => dValue(p, (d) => d.twoPa) },
      { label: "2P%", description: "Two-point field goal percentage", value: (p) => dValue(p, (d) => pct((d.twoPm / Math.max(1, d.twoPa)) * 100)) },
      { label: "3PM", description: "Three-point field goals made", value: (p) => dValue(p, (d) => d.threePm) },
      { label: "3PA", description: "Three-point field goal attempts", value: (p) => dValue(p, (d) => d.threePa) },
      { label: "3P%", description: "Three-point percentage", value: (p) => p.threePointPct },
      { label: "FTM", description: "Free throws made", value: (p) => dValue(p, (d) => d.ftm) },
      { label: "FTA", description: "Free throw attempts", value: (p) => dValue(p, (d) => d.fta) },
      { label: "FT%", description: "Free throw percentage", value: (p) => p.freeThrowPct },
      { label: "eFG%", description: "Effective field goal percentage", value: (p) => dValue(p, (d) => pct(d.efgPct)) },
      { label: "TS%", description: "True shooting percentage", value: (p) => dValue(p, (d) => pct(d.tsPct)) },
      { label: "3PR", description: "Share of FGA from three", value: (p) => dValue(p, (d) => pct(d.threePointRate)) },
      { label: "FTR", description: "Free throw attempt rate", value: (p) => dValue(p, (d) => number(d.freeThrowRate, 2)) },
      { label: "PAINT ATT", description: "Paint attempts", value: (p) => attempts(zoneShots(p, ["Paint"])) },
      { label: "PAINT FG%", description: "Paint field goal percentage", value: (p) => fgPct(zoneShots(p, ["Paint"])) },
      { label: "MID ATT", description: "Mid range attempts", value: (p) => attempts(zoneShots(p, ["Mid Range"])) },
      { label: "MID FG%", description: "Mid range field goal percentage", value: (p) => fgPct(zoneShots(p, ["Mid Range"])) },
      { label: "LC3 ATT", description: "Left corner three attempts", value: (p) => attempts(zoneShots(p, ["Left Corner"])) },
      { label: "RC3 ATT", description: "Right corner three attempts", value: (p) => attempts(zoneShots(p, ["Right Corner"])) },
      { label: "LW3 ATT", description: "Left wing three attempts", value: (p) => attempts(zoneShots(p, ["Left Wing"])) },
      { label: "RW3 ATT", description: "Right wing three attempts", value: (p) => attempts(zoneShots(p, ["Right Wing"])) },
      { label: "TOP3 ATT", description: "Top of key three attempts", value: (p) => attempts(zoneShots(p, ["Top of Key"])) },
    ],
  },
  {
    title: "Scoring",
    note: "Possession-based scoring volume and value from ESPN play-by-play.",
    metrics: [
      { label: "FGA/100", description: "Field goal attempts per 100 on-court possessions", value: (p) => dValue(p, (d) => number((d.fga / Math.max(1, d.onCourtPoss)) * 100)) },
      { label: "TSA", description: "True shot attempts", value: (p) => dValue(p, (d) => number(d.trueShotAttempts)) },
      { label: "2PA", description: "Two-point attempts", value: (p) => dValue(p, (d) => d.twoPa) },
      { label: "3PA", description: "Three-point attempts", value: (p) => dValue(p, (d) => d.threePa) },
      { label: "TSAdd", description: "Points above team-average true shooting", value: (p) => dValue(p, tsAdd) },
      { label: "USG%", description: "Estimated used possessions divided by on-court team possessions", value: (p) => dValue(p, (d) => pct(d.usagePct)) },
      { label: "TOV/100", description: "Turnovers per 100 on-court possessions", value: (p) => dValue(p, (d) => number(d.turnoversPer100)) },
      { label: "PTS CREATED", description: "Points plus points created by assists", value: (p) => dValue(p, (d) => d.pointsCreated) },
      { label: "FT Value", description: "Points scored at the free throw line", value: (p) => dValue(p, (d) => d.ftm) },
    ],
  },
  {
    title: "Impact",
    note: "Player on-court ratings from reconstructed substitution stints.",
    metrics: [
      { label: "ORtg", description: "Team offensive rating while on court", value: (p) => dValue(p, (d) => number(d.onCourtOffRating)) },
      { label: "DRtg", description: "Team defensive rating while on court", value: (p) => dValue(p, (d) => number(d.onCourtDefRating)) },
      { label: "Net", description: "On-court net rating", value: (p) => dValue(p, (d) => plus(d.onCourtNetRating)) },
      { label: "+/-", description: "Raw plus-minus", value: (p) => dValue(p, (d) => plus(d.plusMinus)) },
      { label: "+/- /40", description: "Raw plus-minus per 40 minutes", value: (p) => dValue(p, (d) => plus(d.plusMinusPer40)) },
      { label: "On/Off", description: "On-court net rating minus off-court net rating", value: (p) => dValue(p, (d) => plus(d.onOffNet)) },
      { label: "WOWY", description: "Use the lineup page to select 2, 3, or 5 man groups", value: () => "Lineup page" },
      { label: "RAPM est", description: "Single-season possession estimate using on/off net", value: (p) => dValue(p, (d) => plus(d.onOffNet)) },
      { label: "DPM est", description: "Estimated all-in-one impact using on-court net rating", value: (p) => dValue(p, (d) => plus(d.onCourtNetRating)) },
    ],
  },
  {
    title: "Playmaking",
    note: "Assist creation and ball-control metrics from scoring plays.",
    metrics: [
      { label: "AST", description: "Assists per game", value: (p) => p.assists },
      { label: "AST", description: "Total assists from ESPN play-by-play", value: (p) => dValue(p, (d) => d.assists) },
      { label: "AST%", description: "Share of teammate makes assisted while on court", value: (p) => dValue(p, (d) => pct(d.assistPct)) },
      { label: "AST PTS", description: "Points created by assists", value: (p) => dValue(p, (d) => d.assistPoints) },
      { label: "AST:TOV", description: "Assist-to-turnover ratio", value: (p) => dValue(p, (d) => number(d.assistToTurnover, 2)) },
      { label: "TOV", description: "Turnovers from ESPN play-by-play", value: (p) => dValue(p, (d) => d.turnovers) },
      { label: "AST/100", description: "Assists per 100 on-court possessions", value: (p) => dValue(p, (d) => number((d.assists / Math.max(1, d.onCourtPoss)) * 100)) },
      { label: "PTS CRE", description: "Points plus assisted points", value: (p) => dValue(p, (d) => d.pointsCreated) },
    ],
  },
  {
    title: "Rebounding",
    note: "Offensive and defensive rebounding splits from ESPN play-by-play.",
    metrics: [
      { label: "REB", description: "Total rebounds per game", value: (p) => p.rebounds },
      { label: "REB", description: "Total rebounds from play-by-play", value: (p) => dValue(p, (d) => d.rebounds) },
      { label: "OREB", description: "Offensive rebounds", value: (p) => dValue(p, (d) => d.offensiveRebounds) },
      { label: "DREB", description: "Defensive rebounds", value: (p) => dValue(p, (d) => d.defensiveRebounds) },
      { label: "ORB%", description: "Offensive rebounds divided by team missed FG chances while on court", value: (p) => dValue(p, (d) => pct(d.offensiveReboundPct)) },
      { label: "DRB%", description: "Defensive rebounds divided by opponent missed FG chances while on court", value: (p) => dValue(p, (d) => pct(d.defensiveReboundPct)) },
      { label: "OREB/100", description: "Offensive rebounds per 100 on-court possessions", value: (p) => dValue(p, (d) => number((d.offensiveRebounds / Math.max(1, d.onCourtPoss)) * 100)) },
      { label: "DREB/100", description: "Defensive rebounds per 100 on-court possessions", value: (p) => dValue(p, (d) => number((d.defensiveRebounds / Math.max(1, d.onCourtPoss)) * 100)) },
    ],
  },
  {
    title: "Defense",
    note: "Event defense and on-court defensive results from play-by-play.",
    metrics: [
      { label: "STL", description: "Steals per game", value: (p) => p.steals },
      { label: "BLK", description: "Blocks per game", value: (p) => p.blocks },
      { label: "STL", description: "Steals from ESPN play-by-play", value: (p) => dValue(p, (d) => d.steals) },
      { label: "BLK", description: "Blocks from ESPN play-by-play", value: (p) => dValue(p, (d) => d.blocks) },
      { label: "STL /100", description: "Steals per 100 on-court possessions", value: (p) => dValue(p, (d) => number(d.stealsPer100)) },
      { label: "BLK /100", description: "Blocks per 100 on-court possessions", value: (p) => dValue(p, (d) => number(d.blocksPer100)) },
      { label: "DRtg", description: "Team defensive rating while on court", value: (p) => dValue(p, (d) => number(d.onCourtDefRating)) },
      { label: "Def +/-", description: "Lower defensive rating relative to team is better", value: (p) => dValue(p, (d) => plus(espnPlayerDerived.team.defRating - d.onCourtDefRating)) },
      { label: "STOP est", description: "Steals plus blocks per 100 on-court possessions", value: (p) => dValue(p, (d) => number(d.stealsPer100 + d.blocksPer100)) },
      { label: "Pts Saved/100", description: "Estimated points saved versus team defensive rating", value: (p) => dValue(p, (d) => number(espnPlayerDerived.team.defRating - d.onCourtDefRating)) },
    ],
  },
  {
    title: "Play Types",
    note: "Synergy-style playtype volume and efficiency still needs tagged play types.",
    metrics: [
      { label: "Create", description: "Creation playtype frequency", value: () => needs("Synergy/Hudl tags") },
      { label: "Create TS%", description: "Creation true shooting", value: () => needs("Synergy/Hudl tags") },
      { label: "Spacing", description: "Spacing playtype frequency", value: () => needs("Synergy/Hudl tags") },
      { label: "Spacing TS%", description: "Spacing true shooting", value: () => needs("Synergy/Hudl tags") },
      { label: "Transition", description: "Transition frequency", value: () => needs("Synergy/Hudl tags") },
      { label: "Transition TS%", description: "Transition true shooting", value: () => needs("Synergy/Hudl tags") },
      { label: "Finishing", description: "Finishing playtype frequency", value: () => needs("Synergy/Hudl tags") },
      { label: "PT Diff", description: "Playtype distribution summary", value: () => needs("Synergy/Hudl tags") },
    ],
  },
  {
    title: "Shot Quality",
    note: "Shot-quality RAPM style decomposition needs a shot-quality model.",
    metrics: [
      { label: "oTS", description: "Offensive shooting impact", value: () => needs("shot-quality model") },
      { label: "oSQ", description: "Offensive shot quality generated", value: () => needs("shot-quality model") },
      { label: "oMake", description: "Shot making above expectation", value: () => needs("shot-quality model") },
      { label: "oFT", description: "Free throw value", value: () => needs("shot-quality model") },
      { label: "dTS", description: "Defensive shooting impact", value: () => needs("shot-quality model") },
      { label: "dSQ", description: "Opponent shot quality suppressed", value: () => needs("shot-quality model") },
      { label: "dMake", description: "Opponent shot making allowed", value: () => needs("shot-quality model") },
    ],
  },
];
