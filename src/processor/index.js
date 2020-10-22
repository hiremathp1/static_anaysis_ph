// Processors
const HTMLProcessor = require("./html");
const JSProcessor = require("./js");

const processorMapperByType = {
  html: HTMLProcessor,
  js: JSProcessor,
};

class ProcessorFactory {
  static create(contentType) {
    if (processorMapperByType.hasOwnProperty(contentType)) {
      const P = processorMapperByType[contentType];
      return new P();
    }
  }
}

module.exports = {
  ProcessorFactory,
  HTMLProcessor,
  JSProcessor,
};
