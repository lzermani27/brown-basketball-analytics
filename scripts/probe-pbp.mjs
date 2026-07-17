const gameId = process.argv[2] ?? "401818547";
const html = await (
  await fetch(
    `https://www.espn.com/mens-college-basketball/playbyplay/_/gameId/${gameId}`,
    { headers: { "user-agent": "Mozilla/5.0" } },
  )
).text();
console.log("length", html.length);
for (const needle of ["subbing out for Brown", "Adrian Uchidiuno made"]) {
  const index = html.indexOf(needle);
  console.log("needle", needle, "index", index);
  console.log(html.slice(Math.max(0, index - 700), index + 700));
}
