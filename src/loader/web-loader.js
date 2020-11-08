const ignoredResourceTypes = ["image", "stylesheet", "font"];


class WebLoader {
    constructor(url, options, browser) {
        this.url = url;
        this.attempts = options.crawling_attempts;
        this.browser = browser;
    }

    async exec(url) {
        const contentArray = [];
        const externalScripts = {};

        var browser = this.browser;
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
            // console.log(`TEST: ${response.url()}; ${resourceType}`)

            if (
                status &&
                (!(status > 299 && status < 400) || (status == 304 && options.count_cached_js)) &&
                !(status === 204) &&
                (resourceType === "script") &&
                externalScripts.hasOwnProperty(url)
            ) {
                try {
                    externalScripts[url] = await response.text();
                } catch (e) {
                    /* handle error */
                    console.log(`Failed to load url because: ${e}`)
                }
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

        await page.close();

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
                console.log(`Error fetching data from ${this.url}. `);
                // console.debug(err);
                retValue = null;
            }
        }
        console.log(`Giving up of ${this.url}. `);
        return retValue;
    }
}

module.exports = WebLoader;
