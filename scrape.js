console.log(">>> CLEAN SCRAPER RUNNING (IFRAME MODE) <<<");

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

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  return new Date(year, month - 1, day);
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/************ MAIN ************/
(async function runScraper() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const today = todayMidnight();
  const results = {};

  for (const [bin, url] of Object.entries(BIN_PAGES)) {
    console.log(`\nScraping ${bin}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for ANY iframe to appear
    await page.waitForSelector('iframe', { timeout: 20000 });

    const frames = page.frames();

    if (frames.length < 2) {
      console.log(`❌ No iframe content found for ${bin}`);
      continue;
    }

    // The embedded content is NOT the main frame
    const contentFrame = frames.find(f => f !== page.mainFrame());

    if (!contentFrame) {
      console.log(`❌ Could not access iframe for ${bin}`);
      continue;
    }

    // Wait for dates to appear inside iframe
    await contentFrame.waitForFunction(
      () => /\d{2}\/\d{2}\/\d{4}/.test(document.body.innerText),
      { timeout: 20000 }
    );

    const frameText = await contentFrame.evaluate(
      () => document.body.innerText
    );

    const futureDates = frameText
      .split('\n')
      .map(parseUKDate)
      .filter(d => d && d >= today)
      .sort((a, b) => a - b);

    if (!futureDates.length) {
      console.log(`❌ No future dates found for ${bin}`);
      continue;
    }

    const nextDate = futureDates[0].toISOString().slice(0, 10);
    results[bin] = nextDate;

    console.log(`✅ Next ${bin}: ${nextDate}`);
  }

  console.log("\nFINAL RESULTS:");
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
