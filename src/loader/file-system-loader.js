// Node Modules
const path = require("path");
const fs = require("promise-fs");

class FileSystemLoader {
  constructor(contentPath, options) {
    this.contentPath = contentPath;
    this.allowedExtensions = options.file_extensions;
  }

  async load(contentPath) {
    const fullPath = path.resolve(__basedir, contentPath || this.contentPath);

    console.log("Loading ", fullPath);

    const files = await fs.readdir(fullPath, { withFileTypes: true });
    const folders = files.filter((f) => f.isDirectory());
    const allowedFiles = files.filter(
      (f) =>
        f.isFile() && this.allowedExtensions.some((ext) => f.name.endsWith(ext))
    );

    const foldersContent = await Promise.all(
      folders.map((f) => {
        const fPath = path.resolve(fullPath, f.name);
        return this.load(fPath);
      })
    );

    const filesContent = await Promise.all(
      allowedFiles.map(async (f) => {
        const fPath = path.resolve(fullPath, f.name);
        const content = await fs.readFile(fPath, "utf8");
        const fileExtension = f.name.split(".").pop().toLowerCase();
        return { type: fileExtension, data: content, url: fPath };
      })
    );

    return filesContent
      .concat(foldersContent.flat())
      .map((c) => ({ ...c, origin: "FileSystem" }));
  }
}

module.exports = FileSystemLoader;
