async function test() {
  const res = await fetch("https://institutoeldorado.gupy.io/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
  });
  const html = await res.text();
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (nextDataMatch) {
    const data = JSON.parse(nextDataMatch[1]);
    const jobs = data.props?.pageProps?.jobs || [];
    console.log("Total jobs in Instituto Eldorado:", jobs.length);
    if (jobs.length > 0) {
      console.log("Sample job 1:", JSON.stringify(jobs[0], null, 2));
    }
  }
}
test().catch(console.error);
