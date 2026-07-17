import fs from "node:fs";
import path from "node:path";

const TEAM_ID = "225";
const SEASON = "2026";
const OUT_FILE = path.join("src", "data", "espnPlayerDerived.ts");
const LINEUPS_FILE = path.join("src", "data", "espnLineups.ts");
const SHOTS_FILE = path.join("src", "data", "espnShots.ts");
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

const headers = {
  "user-agent": "Mozilla/5.0",
};

function parseExport(file, exportName) {
  const text = fs.readFileSync(file, "utf8");
  return JSON.parse(
    text
      .replace(new RegExp(`^export const ${exportName} = `), "")
      .replace(/\s+as const;?\s*$/, ""),
  );
}

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
  const ids = new Set();

  for (const match of html.matchAll(/gameId[\\/"_:=-]+(\d{9})/g)) ids.add(match[1]);
  for (const match of html.matchAll(/gameId\/(\d{9})/g)) ids.add(match[1]);
  for (const match of html.matchAll(/401\d{6}/g)) ids.add(match[0]);

  return [...ids];
}

function emptyPlayer(name) {
  return {
    player: name,
    games: 0,
    minutes: 0,
    onCourtPoss: 0,
    onCourtOffPoss: 0,
    onCourtDefPoss: 0,
    onCourtOffFgm: 0,
    onCourtOffFga: 0,
    onCourtOffOrb: 0,
    onCourtDefFga: 0,
    onCourtDefOrb: 0,
    onCourtOffRating: 0,
    onCourtDefRating: 0,
    onCourtNetRating: 0,
    plusMinus: 0,
    plusMinusPer40: 0,
    onOffNet: 0,
    fgm: 0,
    fga: 0,
    twoPm: 0,
    twoPa: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    points: 0,
    efgPct: 0,
    tsPct: 0,
    threePointRate: 0,
    freeThrowRate: 0,
    trueShotAttempts: 0,
    usagePct: 0,
    turnovers: 0,
    assists: 0,
    assistPoints: 0,
    assistToTurnover: 0,
    rebounds: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    steals: 0,
    blocks: 0,
    stealsPer100: 0,
    blocksPer100: 0,
    turnoversPer100: 0,
    pointsCreated: 0,
  };
}

function estimatePoss(fga, fta, tov, orb) {
  return Math.max(0, fga + 0.44 * fta + tov - orb);
}

function rating(points, possessions) {
  return possessions > 0 ? Number(((points / possessions) * 100).toFixed(1)) : 0;
}

function pct(part, whole) {
  return whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0;
}

function per100(value, possessions) {
  return possessions > 0 ? Number(((value / possessions) * 100).toFixed(1)) : 0;
}

function normalizeText(text) {
  return text.replaceAll("’", "'").replaceAll(".", "");
}

function playPlayer(text) {
  const normalized = normalizeText(text);
  return BROWN_PLAYERS.find((name) => normalized.includes(normalizeText(name)));
}

function assistPlayer(text) {
  const normalized = normalizeText(text);
  for (const name of BROWN_PLAYERS) {
    const cleanName = normalizeText(name);
    if (
      normalized.includes(`Assisted by ${cleanName}`) ||
      normalized.includes(`(${cleanName} assists)`)
    ) {
      return name;
    }
  }
  return null;
}

function madeShot(text) {
  return /\bmade\b|\bmakes\b/i.test(text);
}

function missedShot(text) {
  return /\bmissed\b|\bmisses\b/i.test(text);
}

function addIndividualPlay(stats, play) {
  const text = play.text ?? "";
  const player = playPlayer(text);
  const isBrownPlay = play.team?.id === TEAM_ID || text.includes(" for Brown");

  if (!player || !isBrownPlay) return;

  const row = stats.get(player);
  const type = play.type?.text ?? "";
  const isFreeThrow = /free throw/i.test(text);
  if (isFreeThrow && (madeShot(text) || missedShot(text))) {
    row.fta += 1;
    if (madeShot(text)) {
      row.ftm += 1;
      row.points += 1;
    }
  }

  if (/turnover/i.test(text) || type === "Turnover") row.turnovers += 1;
  if (/offensive rebound/i.test(text)) {
    row.rebounds += 1;
    row.offensiveRebounds += 1;
  }
  if (/defensive rebound/i.test(text)) {
    row.rebounds += 1;
    row.defensiveRebounds += 1;
  }
  if (/steal/i.test(text)) row.steals += 1;
  if (/block/i.test(text)) row.blocks += 1;
}

function addAssist(stats, play) {
  const text = play.text ?? "";
  const helper = assistPlayer(text);
  if (!helper) return;

  const row = stats.get(helper);
  row.assists += 1;
  row.assistPoints += Number(play.scoreValue ?? 0);
}

function addOnCourt(stats, lineups) {
  const team = {
    seconds: 0,
    plusMinus: 0,
    offPts: 0,
    offFga: 0,
    offFta: 0,
    offTov: 0,
    offOrb: 0,
    defPts: 0,
    defFga: 0,
    defFta: 0,
    defTov: 0,
    defOrb: 0,
  };

  for (const game of lineups.games) {
    for (const stint of game.stints ?? []) {
      const players = stint.lineup.split(" / ");
      team.seconds += stint.seconds;
      team.plusMinus += stint.plusMinus;
      for (const key of [
        "offPts",
        "offFga",
        "offFta",
        "offTov",
        "offOrb",
        "defPts",
        "defFga",
        "defFta",
        "defTov",
        "defOrb",
      ]) {
        team[key] += stint[key] ?? 0;
      }

      for (const player of players) {
        const row = stats.get(player);
        if (!row) continue;
        row.minutes += stint.seconds / 60;
        row.plusMinus += stint.plusMinus;
        row.onCourtOffPoss += estimatePoss(stint.offFga, stint.offFta, stint.offTov, stint.offOrb);
        row.onCourtDefPoss += estimatePoss(stint.defFga, stint.defFta, stint.defTov, stint.defOrb);
        row.onCourtOffFgm += stint.offFgm ?? 0;
        row.onCourtOffFga += stint.offFga ?? 0;
        row.onCourtOffOrb += stint.offOrb ?? 0;
        row.onCourtDefFga += stint.defFga ?? 0;
        row.onCourtDefOrb += stint.defOrb ?? 0;
        row.onCourtOffRating += stint.offPts;
        row.onCourtDefRating += stint.defPts;
      }
    }
  }

  return team;
}

async function main() {
  const lineups = parseExport(LINEUPS_FILE, "espnLineupSource");
  const shots = parseExport(SHOTS_FILE, "espnShotSource");
  const stats = new Map(BROWN_PLAYERS.map((name) => [name, emptyPlayer(name)]));
  const gameIds = await getScheduleGameIds();
  const gamesPlayed = new Map(BROWN_PLAYERS.map((name) => [name, new Set()]));

  for (const gameId of gameIds) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`;
    const summary = JSON.parse(await fetchText(url));
    for (const play of summary.plays ?? []) {
      addIndividualPlay(stats, play);
      addAssist(stats, play);

      const text = play.text ?? "";
      for (const player of BROWN_PLAYERS) {
        if (normalizeText(text).includes(normalizeText(player))) {
          gamesPlayed.get(player)?.add(gameId);
        }
      }
    }
    console.log(`${gameId}: parsed ${summary.plays?.length ?? 0} plays`);
  }

  const team = addOnCourt(stats, lineups);
  const teamOffPoss = estimatePoss(team.offFga, team.offFta, team.offTov, team.offOrb);
  const teamDefPoss = estimatePoss(team.defFga, team.defFta, team.defTov, team.defOrb);
  const teamNet =
    rating(team.offPts, teamOffPoss) - rating(team.defPts, teamDefPoss);

  for (const shot of shots.shots) {
    const row = stats.get(shot.player);
    if (!row) continue;
    gamesPlayed.get(shot.player)?.add(shot.gameId);
    row.fga += 1;
    row.points += shot.pointsScored;
    if (shot.made) row.fgm += 1;
    if (shot.pointsAttempted === 3) {
      row.threePa += 1;
      if (shot.made) row.threePm += 1;
    } else {
      row.twoPa += 1;
      if (shot.made) row.twoPm += 1;
    }
  }

  const players = [...stats.values()].map((row) => {
    const onOffSeconds = Math.max(0, team.seconds - row.minutes * 60);
    const offPoss = row.onCourtOffPoss;
    const defPoss = row.onCourtDefPoss;
    const offCourtOffPoss = Math.max(0, teamOffPoss - offPoss);
    const offCourtDefPoss = Math.max(0, teamDefPoss - defPoss);
    const onCourtOffPts = row.onCourtOffRating;
    const onCourtDefPts = row.onCourtDefRating;
    const onCourtOffRating = rating(onCourtOffPts, offPoss);
    const onCourtDefRating = rating(onCourtDefPts, defPoss);
    const offCourtNet =
      rating(Math.max(0, team.offPts - onCourtOffPts), offCourtOffPoss) -
      rating(Math.max(0, team.defPts - onCourtDefPts), offCourtDefPoss);
    const trueShotAttempts = row.fga + 0.44 * row.fta;
    const onCourtPoss = (offPoss + defPoss) / 2;
    const playerPossessions = row.fga + 0.44 * row.fta + row.turnovers;

    return {
      ...row,
      games: gamesPlayed.get(row.player)?.size ?? 0,
      minutes: Number(row.minutes.toFixed(1)),
      onCourtPoss: Number(onCourtPoss.toFixed(1)),
      onCourtOffRating,
      onCourtDefRating,
      onCourtNetRating: Number((onCourtOffRating - onCourtDefRating).toFixed(1)),
      plusMinus: Number(row.plusMinus.toFixed(1)),
      plusMinusPer40:
        row.minutes > 0 ? Number(((row.plusMinus / row.minutes) * 40).toFixed(1)) : 0,
      onOffNet:
        onOffSeconds > 0
          ? Number((onCourtOffRating - onCourtDefRating - offCourtNet).toFixed(1))
          : 0,
      efgPct: pct(row.fgm + 0.5 * row.threePm, row.fga),
      tsPct: pct(row.points, 2 * trueShotAttempts),
      threePointRate: pct(row.threePa, row.fga),
      freeThrowRate: row.fga > 0 ? Number((row.fta / row.fga).toFixed(2)) : 0,
      trueShotAttempts: Number(trueShotAttempts.toFixed(1)),
      usagePct: pct(playerPossessions, offPoss),
      assistToTurnover:
        row.turnovers > 0 ? Number((row.assists / row.turnovers).toFixed(2)) : row.assists,
      assistPct: pct(row.assists, Math.max(0, row.onCourtOffFgm - row.fgm)),
      offensiveReboundPct: pct(
        row.offensiveRebounds,
        Math.max(0, row.onCourtOffFga - row.onCourtOffFgm),
      ),
      defensiveReboundPct: pct(
        row.defensiveRebounds,
        Math.max(0, row.onCourtDefFga - row.onCourtDefOrb),
      ),
      stealsPer100: per100(row.steals, onCourtPoss),
      blocksPer100: per100(row.blocks, onCourtPoss),
      turnoversPer100: per100(row.turnovers, onCourtPoss),
      pointsCreated: row.points + row.assistPoints,
    };
  });

  const output = `export const espnPlayerDerived = ${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      season: "2025-26",
      source: "ESPN play-by-play, ESPN shot coordinates, reconstructed lineup stints",
      gamesAttempted: gameIds.length,
      team: {
        minutes: Number((team.seconds / 60 / 5).toFixed(1)),
        offRating: rating(team.offPts, teamOffPoss),
        defRating: rating(team.defPts, teamDefPoss),
        netRating: Number(teamNet.toFixed(1)),
      },
      players,
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
