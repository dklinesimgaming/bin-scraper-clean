console.log(">>> CLEAN SCRAPER RUNNING <<<");

const { chromium } = require('playwright');

/************ BIN PAGES ************/
const BIN_PAGES = {
  general: 'https://cag.walsall.gov.uk/BinCollections/Details?roundname=C02%20THU%20DB&bintype=grey%20bin%20%28general%20waste%293',
  recycling: 'https://cag.walsall.gov.uk/BinCollections/Details?roundname=C02%20THU%20RB&bintype=green%20bin%20%28recycling%29',
  garden: 'https://cag.walsall.gov.uk/BinCollections/Details?roundname=ORB%20MON%2002&bintype=brown%20bin%20%28garden%20waste%29'
};

/************ HELPERS ************/
function parseUKDate(text) {
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match.map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/************ MAIN ************/
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const today = todayMidnight();
  const results = {};

  for (const [bin, url] of Object.entries(BIN_PAGES)) {
    console.log(`\nScraping ${bin}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // ✅ Wait until ANY UK-style date appears anywhere on the page
    await page.waitForFunction(
      () => /\d{2}\/\d{2}\/\d{4}/.test(document.body.innerText),
      { timeout: 20000 }
    );

    // ✅ Extract all visible text from the page
    const pageText = await page.evaluate(() => document.body.innerText);

    // ✅ Extract and parse dates
    const dates = pageText
      .split('\n')
      .map(parseUKDate)
      .filter(d => d && d >= today)
      .sort((a, b) => a - b);

    if (!dates.length) {
      console.log(`❌ No future dates found for ${bin}`);
      continue;
    }

    const nextDate = dates[0].toISOString().slice(0, 10);
    results[bin] = nextDate;

    console.log(`✅ Next ${bin}: ${nextDate}`);
  }

  console.log("\nFINAL RESULTS:");
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();

})();
