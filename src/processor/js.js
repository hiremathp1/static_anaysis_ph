// Node Modules
const fs = require("fs");
const path = require("path");

// Application Modules
const { getCalledFunctions } = require("../js_parser");

// Configuration files
const options = require("../../crawler_options.json");

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

class JSProcessor {
  process(content) {
    let functionCalls = getCalledFunctions(content.data);

    if (Array.isArray(functionsToFilter)) {
      functionCalls = Object.entries(functionCalls).reduce((acc, fCall) => {
        const [fName, calls] = fCall;

        const matched = getFunctionMatch(fName);
        if (matched) {
          if (!Object.prototype.hasOwnProperty.call(acc, matched)) {
            acc[matched] = 0;
          }

          acc[matched] += calls;
        }

        return acc;
      }, {});
    }

    return { ...content, functionCalls };
  }
}

const getFunctionMatch = (fName) => {
  return functionsToFilter.find((filterFn) => {
    const inputLastChunk = fName.split(".").pop();
    const iterLastChunk = filterFn.split(".").pop();

    return fName === filterFn || inputLastChunk === iterLastChunk;
  });
};

module.exports = JSProcessor;
