// Node Modules
const fs = require("promise-fs");
const path = require("path");

// Loaders
const { FileSystemLoader, WebLoader } = require("./loader");

// Configuration files
const options = require("../crawler_options.json");

async function createDataLoaders(cliArguments) {
  // Get the last command line argument.
  const inputPath = path.resolve(cliArguments[cliArguments.length - 1]);
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

  // Return an array populated with the list of URLs to fetch.
  return inputContent
    .split(/[\r\n]+/)
    .filter((url) => url !== "")
    .map((url) => new WebLoader(url, options));
}

module.exports = createDataLoaders;
