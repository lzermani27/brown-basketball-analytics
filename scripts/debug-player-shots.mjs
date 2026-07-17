const player = process.argv.slice(2).join(" ") || "Landon Lewis";
const TEAM_ID = "225";
const headers = { "user-agent": "Mozilla/5.0" };

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers });
  return response.text();
}

const scheduleHtml = await fetchText(
  "https://www.espn.com/mens-college-basketball/team/schedule/_/id/225/season/2026",
);
const gameIds = [...new Set([...scheduleHtml.matchAll(/401\d{6}/g)].map((m) => m[0]))];

for (const gameId of gameIds) {
  const summary = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`,
  );
  const opponent = summary.header.competitions[0].competitors.find(
    (team) => team.team.id !== TEAM_ID,
  )?.team.shortDisplayName;
  const brown = summary.boxscore.players.find((team) => team.team.id === TEAM_ID);
  const athlete = brown.statistics[0].athletes.find(
    (item) => item.athlete.displayName === player,
  );
  const boxFg = athlete?.stats?.[2] ?? "";
  const boxFga = boxFg ? Number(boxFg.split("-")[1]) : 0;
  const shots = summary.plays.filter(
    (play) =>
      play.team?.id === TEAM_ID &&
      play.shootingPlay &&
      play.text?.startsWith(player) &&
      !play.text.toLowerCase().includes("free throw"),
  );
  if (boxFga !== shots.length) {
    console.log(gameId, opponent, "box", boxFg, "shots", shots.length);
    console.log(shots.map((shot) => `${shot.clock.displayValue} ${shot.text}`).join("\n"));
  }
}
