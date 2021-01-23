"use strict";

const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const fs = require("fs");
const path = require("path");
const fsExtra = require("fs-extra");
const readline = require('readline');

const Ext = require("./ext");
const Pdf = require("./pdf");

const ext = new Ext();
const pdf = new Pdf();

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
    description:
      "対象画像拡張子。autoが指定された場合、統一されている拡張子を自動判別する。その場合、拡張子が統一されていないとエラーになる",
    defaultValue: "auto",
  },
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "show help",
  },
  {
    name: "del",
    type: Boolean,
    description: "delete dir after create pdf",
  },
  {
    name: "lists",
    type: String,
    description: "path text",
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

if (options.lists) {
  const rs = fs.createReadStream(options.lists);
  const rl = readline.createInterface({
    input: rs,
  });

  rl.on("line", (dirStr) => {
    main(dirStr, options.ext, options.output);
  });
} else {
  if (!isExistDir(options.dir)) {
    console.log("not directory");
  }

  main(options.dir, options.ext, options.output);
}

function main(dir, extOption, output) {
  console.log(dir)
  fs.readdir(dir, (err, files) => {
    if (err) throw err;

    const list =
      extOption === "auto"
        ? ext.autoExtList(dir, files)
        : ext.getExtList(dir, files, ext);

    if (list.length <= 0) {
      // 出力対象なし
      console.log("no output");
      return;
    }

    const outputFile = selectOutputFile(output, dir);

    pdf.exportPdf(dir, outputFile, list);

    if (options.del) {
      // ディレクトリ削除
      fsExtra.remove(dir, (err) => {
        if (err) throw err;
      });
    }
  });
}

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
