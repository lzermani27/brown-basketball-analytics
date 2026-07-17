import fs from "node:fs";
import path from "node:path";

const TEAM_ID = "225";
const SEASON = "2026";
const OUT_FILE = path.join("src", "data", "espnShots.ts");
const BROWN_PLAYERS = [
  "Landon Lewis",
  "Adrian Uchidiuno",
  "Isaiah Langham",
  "Jeremiah Jenkins",
  "N'famara Dabo",
  "Luke Paragon",
  "Brady Loughlin",
  "David Rochester",
  "Charlie O'Sullivan",
  "Malcolm Wrisby-Jefferson",
  "Wyatt DeGraaf",
  "Jonah Drezner",
  "Drew Kania",
];

const headers = { "user-agent": "Mozilla/5.0" };

async function fetchText(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.text();
}

async function getScheduleGameIds() {
  const url = `https://www.espn.com/mens-college-basketball/team/schedule/_/id/${TEAM_ID}/season/${SEASON}`;
  const html = await fetchText(url);
  return [...new Set([...html.matchAll(/401\d{6}/g)].map((match) => match[0]))];
}

function shooterFromText(text) {
  return BROWN_PLAYERS.find((player) => text.startsWith(player)) ?? null;
}

function shotType(text, pointsAttempted) {
  const lower = text.toLowerCase();
  if (lower.includes("free throw")) return "Free Throw";
  if (pointsAttempted === 3 || lower.includes("three point")) return "3PT";
  if (lower.includes("layup") || lower.includes("dunk")) return "Rim";
  if (lower.includes("tip shot")) return "Rim";
  if (lower.includes("jumper")) return "Jumper";
  return "Other";
}

function zoneFromCoordinate(coordinate, pointsAttempted, text) {
  const lower = text.toLowerCase();

  if (pointsAttempted === 3 || lower.includes("three point")) {
    if (coordinate.x <= 8 && coordinate.y <= 12) return "Left Corner";
    if (coordinate.x >= 42 && coordinate.y <= 12) return "Right Corner";
    if (coordinate.x < 20) return "Left Wing";
    if (coordinate.x > 30) return "Right Wing";
    return "Top of Key";
  }

  const dx = coordinate.x - 25;
  const dy = coordinate.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (
    distance <= 12 ||
    coordinate.y <= 12 ||
    lower.includes("layup") ||
    lower.includes("dunk") ||
    lower.includes("tip shot")
  ) {
    return "Paint";
  }
  return "Mid Range";
}

function normalizeShot(play, gameMeta) {
  const player = shooterFromText(play.text ?? "");
  if (!player || !play.coordinate) return null;
  if (play.text.toLowerCase().includes("free throw")) return null;

  return {
    id: play.id,
    gameId: gameMeta.gameId,
    opponent: gameMeta.opponent,
    date: gameMeta.date,
    player,
    period: play.period?.number ?? 0,
    clock: play.clock?.displayValue ?? "",
    text: play.text,
    x: play.coordinate.x,
    y: play.coordinate.y,
    made: Boolean(play.scoringPlay),
    pointsAttempted: play.pointsAttempted ?? play.scoreValue ?? 2,
    pointsScored: play.scoringPlay ? (play.scoreValue ?? 0) : 0,
    shotType: shotType(play.text, play.pointsAttempted),
    zone: zoneFromCoordinate(play.coordinate, play.pointsAttempted, play.text),
  };
}

function boxScoreFg(summary) {
  const brown = summary.boxscore.players.find((team) => team.team.id === TEAM_ID);
  const map = new Map();

  for (const athlete of brown?.statistics?.[0]?.athletes ?? []) {
    const fg = athlete.stats?.[2];
    if (!fg) continue;
    const [made, attempted] = fg.split("-").map(Number);
    map.set(athlete.athlete.displayName, { made, attempted });
  }

  return map;
}

function reconcileShotsToBoxScore(gameShots, summary) {
  const box = boxScoreFg(summary);
  const reconciled = [];

  for (const player of BROWN_PLAYERS) {
    const playerShots = gameShots.filter((shot) => shot.player === player);
    const target = box.get(player);

    if (!target || playerShots.length <= target.attempted) {
      reconciled.push(...playerShots);
      continue;
    }

    const keep = [...playerShots];

    while (
      keep.filter((shot) => shot.made).length > target.made ||
      keep.length > target.attempted
    ) {
      const madeOver = keep.filter((shot) => shot.made).length > target.made;
      const candidateIndex = keep.findIndex(
        (shot) => madeOver && shot.made && shot.text.toLowerCase().includes("tip"),
      );
      const fallbackIndex = keep.findIndex((shot) =>
        madeOver ? shot.made : !shot.made,
      );
      const index = candidateIndex >= 0 ? candidateIndex : fallbackIndex;

      if (index < 0) break;
      keep.splice(index, 1);
    }

    reconciled.push(...keep);
  }

  return reconciled;
}

function summarize(shots, player = null) {
  const filtered = player ? shots.filter((shot) => shot.player === player) : shots;
  const attempts = filtered.length;
  const makes = filtered.filter((shot) => shot.made).length;
  const points = filtered.reduce((sum, shot) => sum + shot.pointsScored, 0);
  const threes = filtered.filter((shot) => shot.pointsAttempted === 3);
  const threeMakes = threes.filter((shot) => shot.made).length;

  return {
    player: player ?? "Team",
    attempts,
    makes,
    fgPct: attempts ? Number(((makes / attempts) * 100).toFixed(1)) : 0,
    points,
    pointsPerShot: attempts ? Number((points / attempts).toFixed(2)) : 0,
    threeAttempts: threes.length,
    threeMakes,
    threePct: threes.length
      ? Number(((threeMakes / threes.length) * 100).toFixed(1))
      : 0,
  };
}

function summarizeZones(shots) {
  const zones = new Map();
  for (const shot of shots) {
    const current = zones.get(shot.zone) ?? {
      zone: shot.zone,
      attempts: 0,
      makes: 0,
      points: 0,
    };
    current.attempts += 1;
    current.makes += shot.made ? 1 : 0;
    current.points += shot.pointsScored;
    zones.set(shot.zone, current);
  }

  return [...zones.values()]
    .map((zone) => ({
      ...zone,
      fgPct: Number(((zone.makes / zone.attempts) * 100).toFixed(1)),
      pointsPerShot: Number((zone.points / zone.attempts).toFixed(2)),
    }))
    .sort((a, b) => b.attempts - a.attempts);
}

async function main() {
  const gameIds = await getScheduleGameIds();
  const shots = [];
  const games = [];

  for (const gameId of gameIds) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`;
    const summary = JSON.parse(await fetchText(url));
    const competition = summary.header.competitions[0];
    const brown = competition.competitors.find((item) => item.team.id === TEAM_ID);
    const opponent = competition.competitors.find((item) => item.team.id !== TEAM_ID);
    const gameMeta = {
      gameId,
      date: competition.date?.slice(0, 10) ?? "",
      opponent: opponent?.team?.shortDisplayName ?? opponent?.team?.displayName ?? "",
      brownHomeAway: brown?.homeAway ?? "",
    };

    const rawGameShots = summary.plays
      .filter((play) => play.team?.id === TEAM_ID && play.shootingPlay)
      .map((play) => normalizeShot(play, gameMeta))
      .filter(Boolean);
    const gameShots = reconcileShotsToBoxScore(rawGameShots, summary);

    shots.push(...gameShots);
    games.push({ ...gameMeta, shots: gameShots.length });
    console.log(`${gameId}: ${gameShots.length} Brown shots`);
  }

  const players = BROWN_PLAYERS.map((player) => summarize(shots, player))
    .filter((item) => item.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts);

  const output = `export const espnShotSource = ${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      season: "2025-26",
      source: "ESPN play-by-play shot coordinates",
      gamesAttempted: gameIds.length,
      games,
      team: summarize(shots),
      players,
      zones: summarizeZones(shots),
      shots,
    },
    null,
    2,
  )} as const;\n`;

  fs.writeFileSync(OUT_FILE, output);
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
