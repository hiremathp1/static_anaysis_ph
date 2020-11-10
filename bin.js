global.__basedir = __dirname;

// Node Modules
const path = require("path");
const fs = require("promise-fs");
const moment = require("moment");

// Configuration files
const options = require("./crawler_options.json");

// Application Modules
const {ProcessorFactory} = require("./src/processor");
const PuppeteerDataLoader = require("./src/cli");
const {generateCsvFileContent} = require("./src/data_processing");

// Constants
const REPORTS_DIR = path.resolve(__dirname, "reports");
const REQUIRED_FOLDERS = [REPORTS_DIR];

const date = moment().format();

function chunkArray(myArray, chunk_size) {
  if (chunk_size) {
    var results = [];
    while (myArray.length) {
      results.push(myArray.splice(0, chunk_size));
    }
    return results;
  }
  else {
    return [myArray];
  }
}

async function scrape(dataLoaders, dataLoader = 0) {
  // Go through each loader, fetching and processing their data.
  const processedResults = [];
  counter = 0;
  useBrowser = false;
  ignoredUrls = [];
  for (const loader of dataLoaders) {
    console.log(`${counter}: `)
    try {
      var dataContent;
      // Fill dataContent
      // A page crash might happen
      if (useBrowser)
        dataContent = await loader.load(dataLoader.browser);
      else
        dataContent = await loader.load();

      if (dataContent == null)
        continue;

      const processedContent = [];
      for (const content of dataContent) {
        console.log("Processing ", content.url);
        const processor = ProcessorFactory.create(content.type);
        const proccessedValue = await processor.process(content);
        processedContent.push(proccessedValue);
      }
      processedResults.push(...processedContent.flat());
    } catch (err) {
      // Restart browser and ignore url
      console.log(err)
      console.log(`Ignoring url: ${loader.url}`);
      ignoredUrls.push(loader.url);
      counter = 0;
      useBrowser = true;
      await dataLoader.closeBrowser();
      await dataLoader.openBrowser();
      continue;
    }

    // Reset browser after options.nurls_browser_restart times
    if (++counter == options.nurls_browser_restart && dataLoader !== 0 && options.nurls_browser_restart !== 0) {
      console.log("Reseting Browser...");
      counter = 0;
      useBrowser = true;
      await dataLoader.closeBrowser();
      await dataLoader.openBrowser();
    }
  }

  // Write erroed urls
  if (ignoredUrls.length > 0)
    fs.writeFileSync(path.resolve(REPORTS_DIR, `${date}_ignored.txt`), ignoredUrls.join("\n"), (err) => {
      if (err) {
        console.log(err);
      }
    });
  return processedResults;
}

(async function execute() {
  // Measure execution time
  const startTime = new Date();

  // Create the necessary folder structure for the program.
  await createFolderStructure();

  // Get the last command line argument.
  const inputPath = path.resolve(process.argv[2]);

  // Get data loaders.
  const dataLoader = new PuppeteerDataLoader();
  const dataLoaders = await dataLoader.createDataLoaders(inputPath);

  // Number of threads #TODO 
  const numThreads = false; // parseInt(process.argv.pop());
  // if (numThreads)
  // console.log(`Launching ${numThreads} tasks`)

  // Output file name
  const outputFilePath = path.resolve(REPORTS_DIR, `${date}.csv`);
  var processedResults;
  if (numThreads) {
    processedResults = await Promise.all(chunkArray(dataLoaders, numThreads).map(scrape));
    processedResults = processedResults.flat();
  }
  else {
    processedResults = await scrape(dataLoaders, dataLoader);
  }
  await dataLoader.closeBrowser();

  console.log(`Exporting results to CSV at: ${outputFilePath}`)
  const csvContent = await generateCsvFileContent(processedResults);
  fs.writeFileSync(outputFilePath, csvContent, (err) => {
    if (err) {
      console.log("An error ocurried saving the file. Outputing to stdout:");
      console.log(csvContent);
      throw err;
    }
  });
  console.log(`Finished in ${new Date() - startTime}ms`);
  return process.exit(0);
})();

function createFolderStructure() {
  return Promise.all(
    REQUIRED_FOLDERS.map(async (folderPath) => {
      try {
        await fs.mkdir(folderPath);
      } catch (err) {}
    })
  );
}
