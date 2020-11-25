// Node Modules
const csvStringify = require("csv-stringify");
const fs = require("promise-fs");
const url_module = require("url")
const path = require("path");

const options = require("../crawler_options.json");

// Will match for any of those preceded by (
const JqueryCalls = [
    "addClass",
    "after",
    "append",
    "appendTo",
    "attr",
    "before",
    "html",
    "insertAfter",
    "insertBefore",
    "prepend",
    "prependTo",
    "prop",
    "replaceWith",
    "val",
    "wrap",
    "wrapAll",
    "wrapInner",
    "parseHTML",
    "$",
    "jQuery",
    "jQuery.globalEval"
]

// Determine functions input data.
let functionsToFilter = null;

const { function_input_filename } = options;
const inputFunctionsPath = path.resolve(__basedir, function_input_filename);

if (fs.existsSync(inputFunctionsPath)) {
    functionsToFilter = fs
        .readFileSync(inputFunctionsPath, "utf8")
        .split(/[\r\n]+/)
        .map((fn) => fn.trim())
        .filter((fn) => fn !== "");
} else {
    console.log(
        "No functions input file provided. All functions contained in the code will be crawled and parsed."
    );
}

/**
 * Reduces the functions counter objects and HTML content into a single string
 * that can be directly written as a CSV file.
 *
 * @param {Array<Object>} processedResults - an array of results from `generateFunctionsCounter` and HTML string.
 *
 * @return {String} - CSV data ready to be written into the file system.
 */
module.exports.generateCsvFileContent = async (processedResults) => {
    let allFunctions;

    // Make display all functions in functions.txt optional
    if (options.hide_unused_funcNames){
        // The functions identifiers, the 2th ... n-2 or n-1 columns of our CSV file.
        const functions = new Set();

        // Iterate over the provided counters, function names.
        processedResults.forEach(({ functionCalls = {} }) => {
            Object.keys(functionCalls).forEach((fName) => functions.add(fName));
        });

        // Transform the Set into a array for simple iteration and transformation and sort in the order it appears in functions.txt
        allFunctions = [...functions].sort((fName1, fName2) => functionsToFilter.indexOf(fName1) - functionsToFilter.indexOf(fName2));
    }else{
        // use all functions as columns
        allFunctions = functionsToFilter;
    }

    const functionHeaders = allFunctions.map((fName) => JqueryCalls.includes(fName) ? options.jquery_header_prefix + fName : fName)

    const csvHeader = ["link", ...functionHeaders, ...(options.jquery_total ? ["JqueryTotal"] : []), "ExternalJs"];
    
    // Iterates over the list of encountered links from end to beginning
    const { list: csvBody } = processedResults.reduceRight(
        (acc, result) => {
            const { type, origin, data, url, functionCalls = {} } = result;
            const isWebLoader = origin === "WebLoader";
            const isJs = type === "js";
            const isHtml = type === "html";


            // Populate count of found functions 
            if (isWebLoader && isJs) {
                Object.entries(functionCalls).forEach(([fName, calls]) => {
                    if (!Object.prototype.hasOwnProperty.call(acc.counters, fName)) {
                        acc.counters[fName] = 0;
                    }
                    acc.counters[fName] += calls;
                });
            }

            const link = isWebLoader && isJs ? "" : url;
            const rawContent = data;
            const formattedFunctionCalls = generateFormattedFunctions(
                allFunctions,
                isWebLoader && isHtml ? acc.counters : functionCalls
            );

            // If is a crawler.txt site then is time to reset the counters and
            // add a new row.
            if (!(isWebLoader && isJs)) {
                if (acc.jsList == null)
                    acc.jsList = []
                acc.jsList = acc.jsList.filter((jsUrl) => url_module.parse(jsUrl).hostname != url_module.parse(url).hostname);
                let jqueryCounter;
                if (options.jquery_total) {
                    const jqueryCounters = Object.entries(acc.counters).filter((fName) => JqueryCalls.includes(fName[0]));
                    jqueryCounter = jqueryCounters.map((x) => x[1]).reduce((p, c)=> p+c, 0);
                }
                const row = [link, ...formattedFunctionCalls, ...(options.jquery_total ? [jqueryCounter] : []), acc.jsList.length];
                acc.list = [row, ...acc.list];
                acc.jsList = [];
            } else if (isJs && url !== "page_script") {
                if (typeof acc.jsList === 'undefined') {
                    acc.jsList = [];
                }
                acc.jsList.push(url);
            }

            // Reset counters
            if (isWebLoader && isHtml) {
                acc.counters = {};
            }

            return acc;
        },
        {
            counters: {},
            list: [],
        }
    );

    // Write the CSV content header.
    const csvData = [csvHeader, ...csvBody];

    return new Promise((resolve, reject) => {
        csvStringify(csvData, (err, output) => {
            if (err) {
                return reject(err);
            }

            resolve(output);
        });
    });
};

const generateFormattedFunctions = (functionsList, functionCalls) => {
    return functionsList.map((fName) => {
        if (
            functionCalls.hasOwnProperty(fName) &&
            typeof functionCalls[fName] === "number"
        ) {
            return functionCalls[fName];
        }

        return 0;
    });
};
