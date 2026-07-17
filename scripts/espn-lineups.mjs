import fs from "node:fs";
import path from "node:path";

const TEAM_ID = "225";
const SEASON = "2026";
const OUT_FILE = path.join("src", "data", "espnLineups.ts");
const BROWN_PLAYERS = new Set([
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
]);

const headers = {
  "user-agent": "Mozilla/5.0",
};

function clockToElapsed(period, clock) {
  const [minutes, seconds] = clock.split(":").map(Number);
  const remaining = minutes * 60 + seconds;
  if (period <= 2) return (period - 1) * 20 * 60 + (20 * 60 - remaining);
  return 40 * 60 + (period - 3) * 5 * 60 + (5 * 60 - remaining);
}

function lineupKey(lineup) {
  return [...lineup].sort((a, b) => a.localeCompare(b)).join(" / ");
}

function combos(items, size) {
  const result = [];
  function walk(start, picked) {
    if (picked.length === size) {
      result.push([...picked]);
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      picked.push(items[index]);
      walk(index + 1, picked);
      picked.pop();
    }
  }
  walk(0, []);
  return result;
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

  for (const match of html.matchAll(/gameId[\\/"_:=-]+(\d{9})/g)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/gameId\/(\d{9})/g)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/\/game\/_\/gameId\/(\d{9})/g)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/\/boxscore\/_\/gameId\/(\d{9})/g)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/401\d{6}/g)) {
    ids.add(match[0]);
  }

  return [...ids];
}

function getBrownHomeAway(summary) {
  const competitors = summary.header.competitions[0].competitors;
  return competitors.find((competitor) => competitor.team.id === TEAM_ID)
    ?.homeAway;
}

function getBrownStarters(summary) {
  const brown = summary.boxscore.players.find(
    (teamBox) => teamBox.team.id === TEAM_ID,
  );
  return (
    brown?.statistics?.[0]?.athletes
      ?.filter((athlete) => athlete.starter)
      .map((athlete) => athlete.athlete.displayName)
      .filter((name) => BROWN_PLAYERS.has(name)) ?? []
  );
}

function parseSummaryPlays(summary) {
  return summary.plays
    .map((play) => ({
      id: play.id,
      sequenceNumber: Number(play.sequenceNumber ?? 0),
      period: play.period.number,
      time: play.clock.displayValue,
      elapsed: clockToElapsed(play.period.number, play.clock.displayValue),
      teamId: play.team?.id ?? null,
      type: play.type?.text ?? "",
      play: play.text ?? "",
      awayScore: play.awayScore,
      homeScore: play.homeScore,
      scoringPlay: Boolean(play.scoringPlay),
      scoreValue: play.scoreValue ?? 0,
      shootingPlay: Boolean(play.shootingPlay),
      pointsAttempted: play.pointsAttempted ?? 0,
    }))
    .sort((a, b) => a.elapsed - b.elapsed || a.sequenceNumber - b.sequenceNumber);
}

function scoreFor(row, brownHomeAway) {
  const brownScore = brownHomeAway === "home" ? row.homeScore : row.awayScore;
  const opponentScore = brownHomeAway === "home" ? row.awayScore : row.homeScore;
  return { brownScore, opponentScore };
}

function summarizeGame(gameId, summary) {
  const rows = parseSummaryPlays(summary);
  const brownHomeAway = getBrownHomeAway(summary);
  const initial = getBrownStarters(summary);
  if (initial.length !== 5) {
    return {
      gameId,
      status: "needs_review",
      reason: `Could only infer ${initial.length} starters`,
      stints: [],
    };
  }

  const lineup = new Set(initial);
  const stints = [];
  let stintStart = 0;
  let currentBrownScore = 0;
  let currentOpponentScore = 0;
  let stintStartBrownScore = 0;
  let stintStartOpponentScore = 0;
  let stintStats = emptyStats();

  function closeStint(elapsed) {
    if (elapsed > stintStart && lineup.size === 5) {
      stints.push({
        gameId,
        lineup: lineupKey(lineup),
        seconds: elapsed - stintStart,
        plusMinus:
          (currentBrownScore - stintStartBrownScore) -
          (currentOpponentScore - stintStartOpponentScore),
        start: stintStart,
        end: elapsed,
        ...stintStats,
      });
    }
    stintStart = elapsed;
    stintStartBrownScore = currentBrownScore;
    stintStartOpponentScore = currentOpponentScore;
    stintStats = emptyStats();
  }

  for (const row of rows) {
    const isBrownSub =
      row.type === "Substitution" &&
      row.play.includes("subbing ") &&
      row.play.includes(" for Brown");

    if (isBrownSub) {
      closeStint(row.elapsed);
      const outMatch = row.play.match(/^(.+?) subbing out for Brown$/);
      const inMatch = row.play.match(/^(.+?) subbing in for Brown$/);

      if (outMatch && BROWN_PLAYERS.has(outMatch[1].trim())) {
        lineup.delete(outMatch[1].trim());
      }
      if (inMatch && BROWN_PLAYERS.has(inMatch[1].trim())) {
        lineup.add(inMatch[1].trim());
      }
      continue;
    }

    if (lineup.size === 5) {
      addPlayStats(stintStats, row);
    }

    if (Number.isFinite(row.awayScore) && Number.isFinite(row.homeScore)) {
      const score = scoreFor(row, brownHomeAway);
      currentBrownScore = score.brownScore;
      currentOpponentScore = score.opponentScore;
    }
  }

  const gameEnd = Math.max(...rows.map((row) => row.elapsed), 40 * 60);
  closeStint(gameEnd);

  return { gameId, status: "ok", initial, stints };
}

function emptyStats() {
  return {
    offPts: 0,
    offFga: 0,
    offFgm: 0,
    offFta: 0,
    offTov: 0,
    offOrb: 0,
    defPts: 0,
    defFga: 0,
    defFgm: 0,
    defFta: 0,
    defTov: 0,
    defOrb: 0,
  };
}

function isBrownPlay(row) {
  return row.teamId === TEAM_ID || row.play.includes(" for Brown");
}

function addPlayStats(stats, row) {
  const side = isBrownPlay(row) ? "off" : "def";
  const otherSide = side === "off" ? "def" : "off";

  if (row.shootingPlay && !row.play.includes("Free Throw")) {
    stats[`${side}Fga`] += 1;
    if (row.scoringPlay) stats[`${side}Fgm`] += 1;
  }
  if (row.play.includes("Free Throw")) {
    stats[`${side}Fta`] += 1;
  }
  if (row.scoringPlay) {
    stats[`${side}Pts`] += row.scoreValue;
  }
  if (row.type === "Turnover" || row.play.includes("Turnover")) {
    stats[`${side}Tov`] += 1;
  }
  if (row.play.includes("Offensive Rebound")) {
    stats[`${side}Orb`] += 1;
  }
  if (row.play.includes("Defensive Rebound")) {
    // Defensive rebounds end the other team's offensive rebounding chance.
    stats[`${otherSide}Drb`] = (stats[`${otherSide}Drb`] ?? 0) + 1;
  }
}

function aggregate(stints, comboSize) {
  const map = new Map();

  for (const stint of stints) {
    const players = stint.lineup.split(" / ");
    for (const combo of combos(players, comboSize)) {
      const key = combo.join(" / ");
      const current = map.get(key) ?? {
        players: key,
        type: `${comboSize}-man`,
        seconds: 0,
        plusMinus: 0,
        stints: 0,
        offPts: 0,
        offFga: 0,
        offFgm: 0,
        offFta: 0,
        offTov: 0,
        offOrb: 0,
        offDrb: 0,
        defPts: 0,
        defFga: 0,
        defFgm: 0,
        defFta: 0,
        defTov: 0,
        defOrb: 0,
        defDrb: 0,
      };
      current.seconds += stint.seconds;
      current.plusMinus += stint.plusMinus;
      current.stints += 1;
      for (const key of [
        "offPts",
        "offFga",
        "offFgm",
        "offFta",
        "offTov",
        "offOrb",
        "offDrb",
        "defPts",
        "defFga",
        "defFgm",
        "defFta",
        "defTov",
        "defOrb",
        "defDrb",
      ]) {
        current[key] += stint[key] ?? 0;
      }
      map.set(key, current);
    }
  }

  return [...map.values()]
    .map((item) => ({
      ...item,
      minutes: Number((item.seconds / 60).toFixed(1)),
      offPoss: estimatePoss(item.offFga, item.offFta, item.offTov, item.offOrb),
      defPoss: estimatePoss(item.defFga, item.defFta, item.defTov, item.defOrb),
      offRating: rating(item.offPts, estimatePoss(item.offFga, item.offFta, item.offTov, item.offOrb)),
      defRating: rating(item.defPts, estimatePoss(item.defFga, item.defFta, item.defTov, item.defOrb)),
      netRating: Number(
        (
          rating(item.offPts, estimatePoss(item.offFga, item.offFta, item.offTov, item.offOrb)) -
          rating(item.defPts, estimatePoss(item.defFga, item.defFta, item.defTov, item.defOrb))
        ).toFixed(1),
      ),
      offTsPct: tsPct(item.offPts, item.offFga, item.offFta),
      offTovPct: pct(item.offTov, estimatePoss(item.offFga, item.offFta, item.offTov, item.offOrb)),
      offOrbPct: pct(item.offOrb, item.offOrb + item.defDrb),
      defTsPct: tsPct(item.defPts, item.defFga, item.defFta),
      defTovPct: pct(item.defTov, estimatePoss(item.defFga, item.defFta, item.defTov, item.defOrb)),
      defOrbPct: pct(item.defOrb, item.defOrb + item.offDrb),
      plusMinusPer40:
        item.seconds > 0
          ? Number(((item.plusMinus / item.seconds) * 2400).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);
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
  const denom = 2 * (fga + 0.44 * fta);
  return denom > 0 ? Number(((points / denom) * 100).toFixed(1)) : 0;
}

async function main() {
  const gameIds = await getScheduleGameIds();
  const allStints = [];
  const gameReports = [];

  for (const gameId of gameIds) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`;
    const summary = JSON.parse(await fetchText(url));
    const rows = parseSummaryPlays(summary);
    const report = summarizeGame(gameId, summary);
    gameReports.push(report);
    allStints.push(...report.stints);
    const subs = rows.filter((row) => row.play.includes("subbing")).length;
    console.log(
      `${gameId}: ${report.status}, ${rows.length} events, ${subs} subs, ${report.stints.length} stints`,
    );
  }

  const output = `export const espnLineupSource = ${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      season: "2025-26",
      source: "ESPN play-by-play",
      gamesAttempted: gameIds.length,
      gamesParsed: gameReports.filter((game) => game.status === "ok").length,
      games: gameReports,
      lineups2Man: aggregate(allStints, 2),
      lineups3Man: aggregate(allStints, 3),
      lineups5Man: aggregate(allStints, 5),
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
