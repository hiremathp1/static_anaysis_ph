# JS Scraper

## System Requirements

- Node.js 8 or higher;
- NPM;
- Active internet connection.

## How to Use

As soon as you get the project as a .zip or through `git clone`, execute the following steps:

```bash
npm install

# To crawl web URLs, point to a file containing a list of links.
npm start crawler.txt

# To crawl the file system, give the path to the folder.
npm start malicious-js-folder
```

After crawling through the data, the program will then save a CSV file under the `reports` folder. If this folder does not exist, it will be created automatically upon running.

## Output File

The output file name will always be the timestamp of the moment it was generated, keeping your reports in order of creation.

The CSV structure consists of a first column named `link`, and the rest of the columns consisting of function names extracted from the scraped JavaScript code.

## Options

By editing some properties of the file `crawler_options.json`, you can customize some of the application's behavior. Listed below are all of the editable properties and their uses.

| Property                  | Type    | Example       | Description                                                             |
| ------------------------- | ------- | ------------- | ----------------------------------------------------------------------- |
| `crawling_attempts`       | Integer | 3             | The number of times a WebLoader instance will try to fetch a given URL. |
| `function_input_filename` | String  | functions.txt | The path (relative to the project's root folder) to the functions list. |

## How it Works

### Loaders

A Loader is an abstract interface with a single asynchronous method: `load`.
It's _constructor_ accepts two arguments: `url` and `options`.

| Parameter | Type   | Description                                                                     |
| --------- | ------ | ------------------------------------------------------------------------------- |
| `url`     | String | Link or path to a file to be loaded.                                            |
| `options` | Object | An object containing options. This is the `crawler_options` serialized content. |

How each loader handles it's content to be loaded is individual to them. So each implementation of a Loader class must manage it's `load` method properly. Below, are the list of implemented Loader classes.

| Name             | Description                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebLoader        | Uses [Puppeteer](https://github.com/puppeteer/puppeteer) under the hood to fully render pages, including post-inserted scripts and data. Fetches all of the HTML and JavaScript content that is present in the given URL or loaded into it. |
| FileSystemLoader | Recursively load content from a folder, crawling for JavaScript files and reading their content.                                                                                                                                            |

Every Loader's `load` method must return an array of objects. And every object must have the properties: `type`, `data`, `url` and `origin`. These are used on the processing step.

### Processors

A Processor consists of an abstract interface with a single method: `process`.

How each processor handles it's data is individual to them. So each implementation of it must manage it's `process` method properly. Below, are the list of implemented Processor classes.

| Name          | Description                                                                                                                                                                                                                                                                                      |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| HTMLProcessor | As of now, no HTML parsing is needed, since WebLoader's scraping separates every resource, and then JavaScript processing is handled by the related processor.                                                                                                                                   |
| JSProcessor   | Uses [Acorn](https://github.com/acornjs/acorn), *acorn-loose* and *acorn-walk* to parse JavaScript code and get the called functions in the analyzed code. If a file defined in `function_input_filename` is present, it will also filter the functions, generating a smaller, targeted, report. |


There is also a class called `ProcessorFactory`, with a single static `create` method, which utilizes the Factory pattern to deliver the right instance of a processor class given the needs.


### Units

Aside from the classes that are building blocks for the application scalability, we also have some units that are executed in a given time.

- `js_parser`: Exports a method called `getCalledFunctions`, that accepts a string of the JavaScript code and returns a JSON object mapping the function name to the number of times it was called throughout the code.

- `data_processing`: Exports a method called `generateCsvFileContent`, which accepts an array of the processed results and return a single string, representing the structured data as CSV.

- `cli`: Exports a method called `createDataLoaders`, that accepts the cli arguments and returns an array of instances of data loaders classes, ready to be executed.


### Workflow

The code starts running from the file `bin.js`. From there, it executes the `execute` *async* method and follows a straight-forward path. The flow is as follows:

1. Create the folder structure, if not existent, required for the project to run.
2. Create the data loaders from the CLI provided argument.
3. Then, for each loader, it will:
    - 3.1. Load the content;
    - 3.2. Process it;
    - 3.3. Join the processed contents and move on to the next item.
4. Generate a valid CSV string.
5. Write the report into the formatted file, with the date of execution on the filename.
