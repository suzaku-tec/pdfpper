"use strict";

const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
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
    name: "ext",
    alias: "e",
    type: String,
    description: "対象画像拡張子。autoが指定された場合、統一されている拡張子を自動判別する。その場合、拡張子が統一されていないとエラーになる",
    defaultValue: "auto",
  },
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "show help",
  },
];

const sections = [
  {
    header: "pdfpper",
    content: "dir images convert pdf",
  },
  {
    header: "Options",
    optionList: optionDef,
  },
];

const options = commandLineArgs(optionDef);

if (options.help) {
  const usage = commandLineUsage(sections);
  console.log(usage);
  process.exit(0);
}

if (!isExistDir(options.dir)) {
  console.log("not directory");
}

fs.readdir(options.dir, (err, files) => {
  if (err) throw err;

  const list = options.ext === "auto" ? autoExtList(options.dir, files) : getExtList(options.dir, files, options.ext);

  if (list.length <= 0) {
    console.log("no output");
    return;
  }

  const outputFile = selectOutputFile(options.output, options.dir);

  exportPdf(outputFile, list);
});

function selectOutputFile(filePath, dir) {
  if (!filePath) {
    const tmp = dir.substring(0, 251);
    return path.basename(tmp) + ".pdf";
  }

  return !filePath.endsWith(".pdf") ? filePath + ".pdf" : filePath;
}

function isExistDir(dir) {
  return fs.statSync(dir).isDirectory();
}

function exportPdf(outputFile, list) {
  const doc = new PDFDocument({
    autoFirstPage: false,
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
    .map((fileObject) => {
      return options.dir.endsWith("/")
        ? options.dir + fileObject.origin
        : options.dir + "/" + fileObject.origin;
    })
    .forEach((filePath) => {
      const dimensions = imageSize(filePath);

      doc.addPage({
        size: [dimensions.width, dimensions.height],
      });

      doc.image(filePath, 0, 0, {
        width: dimensions.width,
      });
    });
  doc.end();
}

function autoExtList(dir, files) {
  // 拡張子のリストを作る
  const tmp_exts = files.map((file) => {
    return file.slice(((file.lastIndexOf(".") - 1) >>> 0) + 2);
  });
  const exts = Array.from(new Set(tmp_exts));

  if (exts && exts.length !== 1) {
    throw "multi ext. not auto collecting";
  }

  return getExtList(dir, files, exts[0]);
}

function getExtList(dir, files, ext) {
  return files
    .filter((fileName) => {
      const reg = new RegExp(".*." + ext + "$");
      return fs.statSync(dir + "/" + fileName).isFile() && fileName.match(reg);
    })
    .map((fileName) => {
      const padding = fileName.replace("." + ext, "");
      return {
        origin: fileName,
        padding: Number(padding),
      };
    });
}
