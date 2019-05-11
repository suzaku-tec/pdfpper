const commandLineArgs = require('command-line-args');
const PDFDocument = require("pdfkit");
const fs = require("fs")
const imageSize = require("image-size")
const path = require("path")

const optionDef = [{
    name: "dir",
    alias: "d",
    type: String
  },
  {
    name: "output",
    alias: "o",
    type: String
  }
]

const options = commandLineArgs(optionDef);

fs.exists(options.dir, (isExist) => {

  if (!isExist) return;

  fs.readdir(options.dir, (err, files) => {
    if (err) throw err;

    const list = files.filter((fileName) => {
      return fs.statSync(options.dir + "/" + fileName).isFile() && /.*\.jpg$/.test(fileName);
    }).map((fileName) => {

      const padding = fileName.replace(".jpg", "");
      return {
        origin: fileName,
        padding: Number(padding)
      }
    })

    const outputFile = selectOutputFile(options.output, options.dir)

    const doc = new PDFDocument({
      autoFirstPage: false
    });

    doc.pipe(fs.createWriteStream(outputFile));
    const result = list.sort((a, b) => a.padding - b.padding)
    result.map(fileObject => {
      return options.dir.endsWith("/") ? options.dir + fileObject.origin : options.dir + "/" + fileObject.origin;
    }).forEach(filePath => {
      const dimensions = imageSize(filePath)

      doc.addPage({
        size: [dimensions.width, dimensions.height]
      })

      doc.image(filePath, 0, 0, {
        width: dimensions.width
      })
    })
    doc.end();

  })

})

function selectOutputFile(filePath, dir) {

  if (!filePath) {
    return path.basename(dir) + ".pdf"
  }

  return !filePath.endsWith(".pdf") ? filePath + ".pdf" : filePath;
}