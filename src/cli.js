// Node Modules
const fs = require("promise-fs");
const path = require("path");

// Loaders
const { FileSystemLoader, WebLoader } = require("./loader");

// Puppeteer Modules
const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");

// Configure Puppeteer
puppeteer.use(pluginStealth());

// Configuration files
const options = require("../crawler_options.json");

class PuppeteerDataLoader{
  constructor(){}

  async closeBrowser(){
    this.browser.close();
  }

  async createDataLoaders(inputPath) {
    const inputStats = await fs.stat(inputPath);

    if (inputStats.isDirectory()) {
      return [new FileSystemLoader(inputPath, options)];
    }

    // Variable to hold the input text file contents.
    let inputContent;

    // Tries to read the file with the URLs.
    try {
      inputContent = await fs.readFile(inputPath, "utf8");
    } catch (err) {
      console.error("Error while reading the input file", err);
      throw err;
    }

    var browser;
    try{
      browser = await puppeteer.launch({
        headless: true,
      });
    }
    catch{
      browser = await puppeteer.launch({
        headless: true,
        executablePath: options.chromium_fallback_path
      });
    }
    this.browser = browser;
    // Return an array populated with the list of URLs to fetch.
    return inputContent
      .split(/[\r\n]+/)
      .filter((url) => url !== "")
      .map((url) => new WebLoader(url, options, browser));
  }
}
module.exports = PuppeteerDataLoader;
