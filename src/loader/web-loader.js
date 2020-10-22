// Node Modules
const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");

// Configure Puppeteer
puppeteer.use(pluginStealth());

const ignoredResourceTypes = ["image", "stylesheet", "font"];

class WebLoader {
  constructor(url, options) {
    this.url = url;
    this.attempts = options.crawling_attempts;
  }

  async exec(url) {
    const contentArray = [];
    const externalScripts = {};

    const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setRequestInterception(true);

    page.on("request", async (request) => {
      if (request.resourceType() === "script") {
        externalScripts[request.url()] = 0;
      } else if (ignoredResourceTypes.indexOf(request.resourceType()) !== -1) {
        return request.abort();
      }

      request.continue();
    });

    page.on("response", async (response) => {
      const req = response.request();
      const resourceType = req.resourceType();
      const url = response.url();

      let status;
      if (response.status) {
        status = response.status();
      }

      if (
        status &&
        !(status > 299 && status < 400) &&
        !(status === 204) &&
        !(resourceType === "image") &&
        externalScripts.hasOwnProperty(url)
      ) {
        externalScripts[url] = await response.text();
      }
    });

    await page.goto(url);

    const htmlContent = await page.evaluate(
      () => `
    <html>
      ${document.head.outerHTML}
      ${document.body.outerHTML}
    </html>
  `
    );

    const pageLevelScripts = await page.evaluate(() =>
      Array.from(document.getElementsByTagName("script"))
        .map((el) => el.innerHTML)
        .filter(Boolean)
    );

    await browser.close();

    contentArray.push({ type: "html", data: htmlContent, url });
    contentArray.push(
      ...pageLevelScripts.map((content) => ({
        type: "js",
        url: "page_script",
        data: content,
      })),
      ...Object.entries(externalScripts).map(([url, content]) => ({
        type: "js",
        url,
        data: content,
      }))
    );

    return contentArray.map((c) => ({ ...c, origin: "WebLoader" }));
  }

  async load() {
    let retValue = null;

    for (let i = 0; i < this.attempts; i++) {
      console.log("Scraping ", this.url);
      try {
        retValue = await this.exec(this.url);
        break;
      } catch (err) {
        console.log(`Error fetching data from ${this.url}. Retrying...`);
        retValue = null;
      }
    }

    if (!retValue) {
      console.error("Error fetching data from URL " + this.url);
      return { err: this.url };
    }

    return retValue;
  }
}

module.exports = WebLoader;
