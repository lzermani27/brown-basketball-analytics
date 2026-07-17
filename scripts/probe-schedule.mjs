const html = await (
  await fetch(
    "https://www.espn.com/mens-college-basketball/team/schedule/_/id/225/season/2026",
    { headers: { "user-agent": "Mozilla/5.0" } },
  )
).text();

for (const pattern of [
  /gameId.{0,40}/g,
  /\/game\/_\/gameId\/.{0,20}/g,
  /401\d{6}/g,
]) {
  console.log("PATTERN", pattern);
  console.log([...html.matchAll(pattern)].slice(0, 20).map((m) => m[0]));
}
