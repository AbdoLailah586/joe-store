async function run() {
  const res = await fetch('https://joe-store-2026.vercel.app/index.html');
  const html = await res.text();
  const scriptMatches = html.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/g);
  console.log('Live bundle script:', scriptMatches);

  if (scriptMatches && scriptMatches[0]) {
    const jsRes = await fetch('https://joe-store-2026.vercel.app' + scriptMatches[0]);
    const js = await jsRes.text();
    console.log('Does JS include v12_live_hunter_cases_357?', js.includes('v12_live_hunter_cases_357'));
    console.log('Does JS include prod-oraimo-freepods-3c?', js.includes('prod-oraimo-freepods-3c'));
  }
}
run().catch(console.error);
