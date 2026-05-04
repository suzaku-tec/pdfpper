"use strict";

const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const fs = require("fs");
const path = require("path");
const fsExtra = require("fs-extra");
const readline = require("readline");
const AdmZip = require("adm-zip");

const Ext = require("./ext");
const Pdf = require("./pdf");
const sharp = require("sharp");

const ext = new Ext();
const pdf = new Pdf();

const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "tiff", "bmp"];

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

  var rlList = [];
  rl.on("line", (dirStr) => {
    rlList.push(dirStr);
  });
  rl.on("close", () => {
    rlList.forEach(async (dirStr) => {
      try {
        const processedDir = await extractZipIfNeeded(dirStr);
        if (processedDir) {
          await convertWebp(processedDir);
          console.log("close main start");
          await main(processedDir, options.ext, options.output);
        }
      } catch (error) {
        console.error(error);
      }
    });
  });
} else {
  if (!isValidInput(options.dir)) {
    console.log("not directory or zip file");
  }

  (async () => {
    const processedDir = await extractZipIfNeeded(options.dir);
    if (processedDir) {
      await main(processedDir, options.ext, options.output);
    }
  })();
}

async function main(dir, extOption, output) {
  await convertWebp(dir);

  await Promise.resolve().then((resolve) => {
    fs.readdir(dir, async (err, files) => {
      if (err) throw err;

      const list =
        extOption === "auto"
          ? ext.autoExtList(dir, files)
          : ext.getExtList(dir, files, ext);

      if (list.length <= 0) {
        // 出力対象なし
        console.log("no output. dir:" + dir);
        return;
      }

      const outputFile = selectOutputFile(output, dir);

      const changeTimestamp = (outputDir_1) => {
        const timestamp = fs.statSync(outputDir_1).mtime;
        fs.utimesSync(outputFile, timestamp, timestamp);
      };

      await pdf.exportPdf(dir, outputFile, list, changeTimestamp);

      if (options.del) {
        // ディレクトリ削除
        fsExtra.remove(dir, (err_1) => {
          if (err_1) throw err_1;
        });
      }
    });
  });
}

function selectOutputFile(filePath, dir) {
  if (!filePath) {
    const tmp = dir.substring(0, 251);
    return path.basename(tmp) + ".pdf";
  }

  return !filePath.endsWith(".pdf") ? filePath + ".pdf" : filePath;
}

function isValidInput(input) {
  try {
    const stat = fs.statSync(input);
    return stat.isDirectory() || (stat.isFile() && input.endsWith(".zip"));
  } catch {
    return false;
  }
}

async function convertWebp(dir) {
  console.log("convertWebp dir:" + dir);
  return new Promise((resolve, reject) => {
    try {
      var promiseAll = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".webp"))
        .map((file) => {
          var outputPath =
            dir + "\\" + file.substring(0, file.lastIndexOf(".")) + ".jpg";
          var inputPath = dir + "\\" + file;

          // Sharpオブジェクトを生成
          const image = sharp(inputPath);
          return image
            .toFormat("jpg")
            .toFile(outputPath)
            .then(() => {
              image.destroy();
              console.log("remove file: " + inputPath);
              fs.unlinkSync(inputPath);
            });
        });
      Promise.all(promiseAll)
        .then(() => resolve())
        .catch(() => reject());
    } catch (error) {
      reject(error);
    }
  });
}

async function extractZipIfNeeded(dir) {
  if (!dir.endsWith(".zip")) {
    return dir;
  }

  const zip = new AdmZip(dir);
  const zipEntries = zip.getEntries();

  // 画像ファイルがあるかチェック
  const hasImages = zipEntries.some((entry) => {
    if (entry.isDirectory) return false;
    const ext = path.extname(entry.entryName).toLowerCase().slice(1);
    return imageExtensions.includes(ext);
  });

  if (!hasImages) {
    console.log("No image files in zip, skipping extraction.");
    return null;
  }

  // 展開ディレクトリを作成
  const extractDir = path.join(path.dirname(dir), path.basename(dir, ".zip"));
  zip.extractAllTo(extractDir, true);
  console.log("Extracted zip to:", extractDir);
  return extractDir;
}
