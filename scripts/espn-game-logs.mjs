import fs from "node:fs";
import path from "node:path";

const TEAM_ID = "225";
const SEASON = "2026";
const OUT_FILE = path.join("src", "data", "espnGameLogs.ts");
const LINEUPS_FILE = path.join("src", "data", "espnLineups.ts");
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
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
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

function splitMadeAttempt(value = "0-0") {
  const [made = "0", attempted = "0"] = value.split("-");
  return [Number(made) || 0, Number(attempted) || 0];
}

function statMap(teamBox) {
  return Object.fromEntries(
    (teamBox?.statistics ?? []).map((stat) => [stat.name, stat.displayValue]),
  );
}

function statNumber(map, key) {
  return Number(map[key] ?? 0) || 0;
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

function tsPct(points, fga, fta) {
  return pct(points, 2 * (fga + 0.44 * fta));
}

function parseMinutes(value = "0") {
  if (!value.includes(":")) return Number(value) || 0;
  const [minutes, seconds] = value.split(":").map(Number);
  return Number((minutes + seconds / 60).toFixed(1));
}

function boxPlayerRows(summary) {
  const brownBox = summary.boxscore.players.find((team) => team.team.id === TEAM_ID);
  const section = brownBox?.statistics?.[0];
  const labels = section?.labels ?? [];
  return (section?.athletes ?? [])
    .filter((row) => !row.didNotPlay && BROWN_PLAYERS.includes(row.athlete.displayName))
    .map((row) => {
      const values = Object.fromEntries(labels.map((label, index) => [label, row.stats[index] ?? "0"]));
      const [fgm, fga] = splitMadeAttempt(values.FG);
      const [threePm, threePa] = splitMadeAttempt(values["3PT"]);
      const [ftm, fta] = splitMadeAttempt(values.FT);
      const points = Number(values.PTS ?? 0) || 0;
      const turnovers = Number(values.TO ?? 0) || 0;
      const rebounds = Number(values.REB ?? 0) || 0;
      const assists = Number(values.AST ?? 0) || 0;
      const steals = Number(values.STL ?? 0) || 0;
      const blocks = Number(values.BLK ?? 0) || 0;
      const offensiveRebounds = Number(values.OREB ?? 0) || 0;
      const defensiveRebounds = Number(values.DREB ?? 0) || 0;
      const personalFouls = Number(values.PF ?? 0) || 0;

      return {
        player: row.athlete.displayName,
        minutes: parseMinutes(values.MIN),
        points,
        fgm,
        fga,
        threePm,
        threePa,
        ftm,
        fta,
        rebounds,
        offensiveRebounds,
        defensiveRebounds,
        assists,
        turnovers,
        steals,
        blocks,
        personalFouls,
        efgPct: pct(fgm + 0.5 * threePm, fga),
        tsPct: tsPct(points, fga, fta),
        threePointRate: pct(threePa, fga),
        freeThrowRate: fga > 0 ? Number((fta / fga).toFixed(2)) : 0,
        gameScore: Number(
          (
            points +
            0.4 * fgm -
            0.7 * fga -
            0.4 * (fta - ftm) +
            0.7 * offensiveRebounds +
            0.3 * defensiveRebounds +
            steals +
            0.7 * assists +
            0.7 * blocks -
            0.4 * personalFouls -
            turnovers
          ).toFixed(1),
        ),
      };
    });
}

function gameStints(lineups, gameId) {
  return lineups.games.find((game) => game.gameId === gameId)?.stints ?? [];
}

function addPlayerStints(playerRow, stints) {
  const totals = {
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
  for (const stint of stints) {
    if (!stint.lineup.split(" / ").includes(playerRow.player)) continue;
    totals.seconds += stint.seconds;
    totals.plusMinus += stint.plusMinus;
    for (const key of Object.keys(totals)) {
      if (key !== "seconds" && key !== "plusMinus") totals[key] += stint[key] ?? 0;
    }
  }
  const offPoss = estimatePoss(totals.offFga, totals.offFta, totals.offTov, totals.offOrb);
  const defPoss = estimatePoss(totals.defFga, totals.defFta, totals.defTov, totals.defOrb);
  const avgPoss = (offPoss + defPoss) / 2;
  return {
    onCourtMinutes: Number((totals.seconds / 60).toFixed(1)),
    plusMinus: totals.plusMinus,
    plusMinusPer40: totals.seconds > 0 ? Number(((totals.plusMinus / totals.seconds) * 2400).toFixed(1)) : 0,
    onCourtOffRating: rating(totals.offPts, offPoss),
    onCourtDefRating: rating(totals.defPts, defPoss),
    onCourtNetRating: Number((rating(totals.offPts, offPoss) - rating(totals.defPts, defPoss)).toFixed(1)),
    onCourtPoss: Number(avgPoss.toFixed(1)),
  };
}

async function main() {
  const lineups = parseExport(LINEUPS_FILE, "espnLineupSource");
  const gameIds = await getScheduleGameIds();
  const games = [];
  const playerGameLogs = [];

  for (const gameId of gameIds) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`;
    const summary = JSON.parse(await fetchText(url));
    const competition = summary.header.competitions[0];
    const brown = competition.competitors.find((team) => team.team.id === TEAM_ID);
    const opponent = competition.competitors.find((team) => team.team.id !== TEAM_ID);
    const brownTeam = summary.boxscore.teams.find((team) => team.team.id === TEAM_ID);
    const oppTeam = summary.boxscore.teams.find((team) => team.team.id !== TEAM_ID);
    const brownStats = statMap(brownTeam);
    const oppStats = statMap(oppTeam);
    const [fgm, fga] = splitMadeAttempt(brownStats["fieldGoalsMade-fieldGoalsAttempted"]);
    const [threePm, threePa] = splitMadeAttempt(brownStats["threePointFieldGoalsMade-threePointFieldGoalsAttempted"]);
    const [ftm, fta] = splitMadeAttempt(brownStats["freeThrowsMade-freeThrowsAttempted"]);
    const [oppFgm, oppFga] = splitMadeAttempt(oppStats["fieldGoalsMade-fieldGoalsAttempted"]);
    const [, oppFta] = splitMadeAttempt(oppStats["freeThrowsMade-freeThrowsAttempted"]);
    const pointsFor = Number(brown.score);
    const pointsAgainst = Number(opponent.score);
    const turnovers = statNumber(brownStats, "turnovers");
    const offensiveRebounds = statNumber(brownStats, "offensiveRebounds");
    const oppTurnovers = statNumber(oppStats, "turnovers");
    const oppOffensiveRebounds = statNumber(oppStats, "offensiveRebounds");
    const possessions = estimatePoss(fga, fta, turnovers, offensiveRebounds);
    const opponentPossessions = estimatePoss(oppFga, oppFta, oppTurnovers, oppOffensiveRebounds);
    const stints = gameStints(lineups, gameId);
    const topPlayer = boxPlayerRows(summary).sort((a, b) => b.gameScore - a.gameScore)[0];

    const game = {
      gameId,
      date: competition.date.slice(0, 10),
      opponent: opponent.team.displayName,
      homeAway: brown.homeAway,
      result: pointsFor > pointsAgainst ? "W" : "L",
      score: `${pointsFor}-${pointsAgainst}`,
      pointsFor,
      pointsAgainst,
      fgm,
      fga,
      fgPct: pct(fgm, fga),
      threePm,
      threePa,
      threePct: pct(threePm, threePa),
      ftm,
      fta,
      ftPct: pct(ftm, fta),
      rebounds: statNumber(brownStats, "totalRebounds"),
      offensiveRebounds,
      defensiveRebounds: statNumber(brownStats, "defensiveRebounds"),
      assists: statNumber(brownStats, "assists"),
      turnovers,
      steals: statNumber(brownStats, "steals"),
      blocks: statNumber(brownStats, "blocks"),
      fouls: statNumber(brownStats, "fouls"),
      pointsInPaint: statNumber(brownStats, "pointsInPaint"),
      fastBreakPoints: statNumber(brownStats, "fastBreakPoints"),
      pointsOffTurnovers: statNumber(brownStats, "turnoverPoints"),
      largestLead: statNumber(brownStats, "largestLead"),
      possessions: Number(possessions.toFixed(1)),
      pace: Number(((possessions + opponentPossessions) / 2).toFixed(1)),
      offensiveRating: rating(pointsFor, possessions),
      defensiveRating: rating(pointsAgainst, opponentPossessions),
      netRating: Number((rating(pointsFor, possessions) - rating(pointsAgainst, opponentPossessions)).toFixed(1)),
      efgPct: pct(fgm + 0.5 * threePm, fga),
      tsPct: tsPct(pointsFor, fga, fta),
      turnoverRate: pct(turnovers, possessions),
      offensiveReboundRate: pct(offensiveRebounds, offensiveRebounds + statNumber(oppStats, "defensiveRebounds")),
      freeThrowRate: fga > 0 ? Number((fta / fga).toFixed(2)) : 0,
      opponentFgm: oppFgm,
      opponentFga: oppFga,
      opponentEfgPct: pct(oppFgm + 0.5 * splitMadeAttempt(oppStats["threePointFieldGoalsMade-threePointFieldGoalsAttempted"])[0], oppFga),
      topPlayer: topPlayer?.player ?? "N/A",
      topGameScore: topPlayer?.gameScore ?? 0,
      stints: stints.length,
    };
    games.push(game);

    for (const row of boxPlayerRows(summary)) {
      const playerPoss = row.fga + 0.44 * row.fta + row.turnovers;
      playerGameLogs.push({
        gameId,
        date: game.date,
        opponent: game.opponent,
        result: game.result,
        score: game.score,
        ...row,
        usagePct: pct(playerPoss, possessions),
        pointsCreated: row.points + row.assists * 2,
        ...addPlayerStints(row, stints),
      });
    }

    console.log(`${game.date}: Brown ${game.score} vs ${game.opponent}`);
  }

  const output = `export const espnGameLogs = ${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      season: "2025-26",
      source: "ESPN box score, ESPN play-by-play, reconstructed lineup stints",
      games,
      playerGameLogs,
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
