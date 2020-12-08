const commandLineArgs = require("command-line-args");
const commandLineUsage = require('command-line-usage');
const PDFDocument = require("pdfkit");
const fs = require("fs");
const imageSize = require("image-size");
const path = require("path");

const optionDef = [
  {
    name: "dir",
    alias: "d",
    type: String,
    description: "画像格納フォルダを指定する",
  },
  {
    name: "output",
    alias: "o",
    type: String,
    description: "出力ファイルパス",
  },
  {
    name: 'ext',
    alias: 'e',
    type: String,
    description: '対象画像拡張子',
    defaultValue: "jpg"
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'show help'
  },
];

const sections = [
  {
    header: 'pdfpper',
    content: 'dir images convert pdf'
  },
  {
    header: 'Options',
    optionList: optionDef
  }
];

const options = commandLineArgs(optionDef);

if(options.help) {
  const usage = commandLineUsage(sections);
  console.log(usage);
  process.exit(0);
}

fs.stat(options.dir, err => {
  if (err) {
    console.log(err)
    return
  }
  fs.readdir(options.dir, (err2, files) => {
    if (err2) throw err2;

    const list = files
      .filter(fileName => {
        let reg = new RegExp(".*\." + options.ext + "$")
        return (
          fs.statSync(options.dir + "/" + fileName).isFile() &&
          fileName.match(reg)
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
