global.__basedir = __dirname;

// Node Modules
const path = require("path");
const fs = require("promise-fs");
const moment = require("moment");

// Application Modules
const {ProcessorFactory} = require("./src/processor");
const PuppeteerDataLoader = require("./src/cli");
const {generateCsvFileContent} = require("./src/data_processing");

// Constants
const REPORTS_DIR = path.resolve(__dirname, "reports");
const REQUIRED_FOLDERS = [REPORTS_DIR];

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

async function scrape(dataLoaders) {
  // Go through each loader, fetching and processing their data.
  const processedResults = [];
  for (const loader of dataLoaders) {
    const dataContent = await loader.load();
    if (dataContent == null) {
      continue;
    }

    const processedContent = [];
    for (const content of dataContent) {
      console.log("Processing ", content.url);
      const processor = ProcessorFactory.create(content.type);
      const proccessedValue = await processor.process(content);
      processedContent.push(proccessedValue);
    }

    processedResults.push(...processedContent.flat());
  }
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

  // Number of threads
  const numThreads = parseInt(process.argv.pop());
  if (numThreads)
    console.log(`Launching ${numThreads} tasks`)

  // Output file name
  const date = moment().format();
  const outputFilePath = path.resolve(REPORTS_DIR, `${date}.csv`);
  var processedResults;
  if (numThreads) {
    processedResults = await Promise.all(chunkArray(dataLoaders, numThreads).map(scrape));
    processedResults = processedResults.flat();
  }
  else {
    processedResults = await scrape(dataLoaders);
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
  const endTime = new Date();
  console.log(`Finished in ${endTime.getSeconds() - startTime.getSeconds()}s`)
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
