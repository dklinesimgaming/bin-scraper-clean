console.log(">>> CLEAN SCRAPER RUNNING <<<");

const { chromium } = require('playwright');

const BIN_PAGES = {
  general: 'https://cag.walsall.gov.uk/BinCollections/Details?roundname=C02%20THU%20DB&bintype=grey%20bin%20%28general%20waste%293',
  recycling: 'https://cag.walsall.gov.uk/BinCollections/Details?roundname=C02%20THU%20RB&bintype=green%20bin%20%28recycling%29',
  garden: 'https://cag.walsall.gov.uk/BinCollections/Details?roundname=ORB%20MON%2002&bintype=brown%20bin%20%28garden%20waste%29'
};

function parseUKDate(ddmmyyyy) {
  const [dd, mm, yyyy] = ddmmyyyy.split('/').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const today = todayMidnight();

  for (const [bin, url] of Object.entries(BIN_PAGES)) {
    console.log(`Scraping ${bin}...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    const dates = await page.$$eval(
  'table tr td:nth-child(2)',
  tds => tds.map(td => td.textContent)
);

console.log("RAW DATE CELLS:", dates);

    );

    const future = dates
      .map(parseUKDate)
      .filter(d => d >= today)
      .sort((a, b) => a - b);

    if (future.length) {
      console.log(`Next ${bin}: ${future[0].toISOString().slice(0,10)}`);
    } else {
      console.log(`No future dates for ${bin}`);
    }
  }

  await browser.close();
})();
