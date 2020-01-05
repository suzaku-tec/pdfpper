const commandLineArgs = require("command-line-args");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const imageSize = require("image-size");
const path = require("path");

const optionDef = [
  {
    name: "dir",
    alias: "d",
    type: String
  },
  {
    name: "output",
    alias: "o",
    type: String
  }
];

const options = commandLineArgs(optionDef);

fs.stat(options.dir, err => {
  if (err) return;

  fs.readdir(options.dir, (err, files) => {
    if (err) throw err;

    const list = files
      .filter(fileName => {
        return (
          fs.statSync(options.dir + "/" + fileName).isFile() &&
          /.*\.jpg$/.test(fileName)
        );
      })
      .map(fileName => {
        const padding = fileName.replace(".jpg", "");
        return {
          origin: fileName,
          padding: Number(padding)
        };
      });

    if (list.length <= 0) {
      return;
    }

    const outputFile = selectOutputFile(options.output, options.dir);

    const doc = new PDFDocument({
      autoFirstPage: false
    });

    doc.pipe(fs.createWriteStream(outputFile));
    const result = list.sort((fa, fb) => {
      const a = fa.origin;
      const b = fb.origin;
      const a1 = parseInt(a.replace(/^\d*$/g, ""), 10);
      const b1 = parseInt(b.replace(/^\d*$/g, ""), 10);
      const a2 = a1 !== a1 ? 0 : a1;
      const b2 = b1 !== b1 ? 0 : b1;

      if (a2 > b2) {
        return 1;
      } else if (a2 < b2) {
        return -1;
      }
      return 0;
    });
    result
      .map(fileObject => {
        return options.dir.endsWith("/")
          ? options.dir + fileObject.origin
          : options.dir + "/" + fileObject.origin;
      })
      .forEach(filePath => {
        const dimensions = imageSize(filePath);

        doc.addPage({
          size: [dimensions.width, dimensions.height]
        });

        doc.image(filePath, 0, 0, {
          width: dimensions.width
        });
      });
    doc.end();
  });
});

function selectOutputFile(filePath, dir) {
  if (!filePath) {
    return path.basename(dir) + ".pdf";
  }

  return !filePath.endsWith(".pdf") ? filePath + ".pdf" : filePath;
}
