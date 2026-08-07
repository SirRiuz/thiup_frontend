const puppeteer = require("puppeteer-core");
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1400,1000"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/home", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    btns.find((el) => /understand/i.test(el.textContent || ""))?.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  const frameCount = await page.$$eval('[data-frame]', els => els.length);
  console.log("frame count:", frameCount);
  await page.evaluate(() => {
    const f = document.querySelector('[data-frame]');
    f?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const html = await page.evaluate(() => {
    const v = document.querySelector('[class*="MediaViewer"]');
    return v ? v.outerHTML.slice(0, 1500) : "NO MediaViewer found";
  });
  console.log(html);
  await browser.close();
})();
