global.__basedir = __dirname;

// Node Modules
const path = require("path");
const fs = require("promise-fs");
const moment = require("moment");

// Application Modules
const { ProcessorFactory } = require("./src/processor");
const createDataLoaders = require("./src/cli");
const { generateCsvFileContent } = require("./src/data_processing");
const { isRegExp } = require("util");

// Constants
const REPORTS_DIR = path.resolve(__dirname, "reports");
const FAILEDURLS_DIR = path.resolve(__dirname, "FailedURLs");
const REQUIRED_FOLDERS = [REPORTS_DIR, FAILEDURLS_DIR];

(async function execute() {
  // Create the necessary folder structure for the program.
  await createFolderStructure();

  // Get data loaders.
  const dataLoaders = await createDataLoaders(process.argv);

  function timeStamp() {
    // Create a date object with the current time
    var now = new Date();

    // Create an array with the current month, day and time
    var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];

    // Create an array with the current hour, minute and second
    var time = [now.getHours(), now.getMinutes(), now.getSeconds()];

    // Determine AM or PM suffix based on the hour
    var suffix = time[0] < 12 ? "AM" : "PM";

    // Convert hour from military time
    time[0] = time[0] < 12 ? time[0] : time[0] - 12;

    // If hour is 0, set it to 12
    time[0] = time[0] || 12;

    // If seconds and minutes are less than 10, add a zero
    for (var i = 1; i < 3; i++) {
      if (time[i] < 10) {
        time[i] = "0" + time[i];
      }
    }

    // Return the formatted string
    return date.join("-") + "+" + time.join("-") + suffix;
  }

  // Go through each loader, fetching and processing their data.
  const processedResults = [];
  const failedURLS = [];
  for (const loader of dataLoaders) {
    const dataContent = await loader.load();
    if (!dataContent.err) {
      const processedContent = [];
      for (const content of dataContent) {
        console.log("Processing ", content.url);
        const processor = ProcessorFactory.create(content.type);
        const proccessedValue = await processor.process(content);
        processedContent.push(proccessedValue);
      }

      processedResults.push(...processedContent.flat());
    } else failedURLS.push(dataContent.err);
  }
  const crawler = await fs.readFile("crawler.txt", "utf8");
  
  let givenLinks = crawler.split("\n");
  const newDate = new Date();
  let finalResults = [];
  processedResults.map((result) => {
    result.data = "";
    finalResults.push(result);
  });
  const csvContent = await generateCsvFileContent(finalResults);
  const file = await fs.writeFile(
    __dirname + `/reports/${timeStamp()}.csv`,
    csvContent
  );
  let urlData = failedURLS.join();
   await fs.writeFile(
    __dirname + `/failedURLs/${timeStamp()}.txt`,
    urlData
  );

  console.log(`Failed URL's`);
  console.log(failedURLS);
  return file;
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
