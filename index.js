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
const createLogger = require("./logger");

const logger = createLogger("info");

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

let overallTotalPages = 0;
let overallCompletedPages = 0;

function logError(error) {
  if (error instanceof Error) {
    logger.error(error.stack || error.message);
  } else {
    logger.error(error);
  }
}

function renderOverallProgress(completed, total) {
  if (!process.stdout.isTTY) {
    return;
  }

  const width = 40;
  const ratio = total ? completed / total : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "-".repeat(empty);
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`Overall Progress: ${completed}/${total} [${bar}]`);
  if (completed === total) {
    process.stdout.write("\n");
  }
}

async function countImages(inputPath, extOption) {
  try {
    const stat = fs.statSync(inputPath);
    if (stat.isFile() && inputPath.endsWith(".zip")) {
      const zip = new AdmZip(inputPath);
      const zipEntries = zip.getEntries().filter((entry) => {
        if (entry.isDirectory) return false;
        const ext = path.extname(entry.entryName).toLowerCase().slice(1);
        return imageExtensions.includes(ext);
      });

      if (extOption === "auto") {
        const exts = Array.from(
          new Set(
            zipEntries.map((entry) =>
              path.extname(entry.entryName).toLowerCase().slice(1),
            ),
          ),
        );
        if (exts.length !== 1) {
          return 0;
        }
        return zipEntries.filter(
          (entry) =>
            path.extname(entry.entryName).toLowerCase().slice(1) === exts[0],
        ).length;
      }

      return zipEntries.filter(
        (entry) =>
          path.extname(entry.entryName).toLowerCase().slice(1) === extOption,
      ).length;
    }

    if (stat.isDirectory()) {
      const files = fs.readdirSync(inputPath);
      return extOption === "auto"
        ? ext.autoExtList(inputPath, files).length
        : ext.getExtList(inputPath, files, extOption).length;
    }

    return 0;
  } catch (error) {
    logError(error);
    return 0;
  }
}

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
  rl.on("close", async () => {
    rlList = rlList.filter((dirStr) => dirStr && dirStr.trim());

    const counts = await Promise.all(
      rlList.map(async (dirStr) => countImages(dirStr, options.ext)),
    );
    overallTotalPages = counts.reduce((sum, count) => sum + count, 0);
    logger.info(`Overall total pages: ${overallTotalPages}`);

    (async () => {
      for (const dirStr of rlList) {
        try {
          const result = await extractZipIfNeeded(dirStr);
          if (result) {
            const { dir: processedDir, zipPath } = result;
            await convertWebp(processedDir);
            logger.debug("close main start");
            await main(
              processedDir,
              options.ext,
              options.output,
              zipPath,
              (pageNumber, pageTotal) => {
                overallCompletedPages += 1;
                renderOverallProgress(overallCompletedPages, overallTotalPages);
              },
            );
          }
        } catch (error) {
          logError(error);
        }
      }
    })();
  });
} else {
  if (!options.dir || !isValidInput(options.dir)) {
    logger.warn("not directory or zip file");
    process.exit(1);
  }

  (async () => {
    const result = await extractZipIfNeeded(options.dir);
    if (result) {
      const { dir: processedDir, zipPath } = result;
      overallTotalPages = await countImages(options.dir, options.ext);
      overallCompletedPages = 0;
      await main(
        processedDir,
        options.ext,
        options.output,
        zipPath,
        (pageNumber, pageTotal) => {
          overallCompletedPages += 1;
          renderOverallProgress(overallCompletedPages, overallTotalPages);
        },
      );
    }
  })();
}

/**
 * メイン処理：ディレクトリ内の画像をPDFに変換
 * @param {string} dir - 処理対象のディレクトリパス
 * @param {string} extOption - 対象拡張子（'auto'の場合は自動判別）
 * @param {string} output - 出力ファイルパス
 * @param {string|null} zipPath - 元のzipファイルパス（zipから展開した場合）
 * @returns {Promise<void>}
 */
async function main(dir, extOption, output, zipPath, progressFn) {
  await convertWebp(dir);

  try {
    const files = await fs.promises.readdir(dir);
    const list =
      extOption === "auto"
        ? ext.autoExtList(dir, files)
        : ext.getExtList(dir, files, ext);

    if (list.length <= 0) {
      // 出力対象なし
      logger.warn("no output. dir:" + dir);
      return;
    }

    const outputFile = selectOutputFile(output, dir);

    const changeTimestamp = (outputDir_1) => {
      let timestamp;
      if (zipPath && fs.existsSync(zipPath)) {
        timestamp = fs.statSync(zipPath).mtime;
      } else {
        timestamp = fs.statSync(outputDir_1).mtime;
      }
      fs.utimesSync(outputFile, timestamp, timestamp);
    };

    const { failedFiles } = await pdf.exportPdf(
      dir,
      outputFile,
      list,
      changeTimestamp,
      progressFn,
    );

    // 失敗したファイルがあれば、失敗ログを出力
    if (failedFiles && failedFiles.length > 0) {
      logger.warn(`${failedFiles.length} file(s) failed to process`);
      failedFiles.forEach((failedFile) => {
        logger.warn(`  - ${failedFile.file}: ${failedFile.error}`);
      });

      // 失敗リストを別ファイルに保存
      const failureListPath = outputFile.replace(".pdf", "_failures.txt");
      const failureContent = failedFiles
        .map((f) => `${f.file}: ${f.error}`)
        .join("\n");
      fs.writeFileSync(failureListPath, failureContent, "utf8");
      logger.info(`Failure list saved to: ${failureListPath}`);
    } else {
      logger.info("All files processed successfully");
    }

    if (options.del) {
      // ディレクトリ削除
      fsExtra.remove(dir, (err_1) => {
        if (err_1) logError(err_1);
        // zipファイルも削除
        if (zipPath && fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
          logger.info("Deleted zip file: " + zipPath);
        }
      });
    }
  } catch (error) {
    logError(error);
    throw error;
  }
}

/**
 * 出力ファイルパスを決定
 * @param {string|undefined} filePath - 指定された出力ファイルパス
 * @param {string} dir - ディレクトリパス
 * @returns {string} 出力ファイルパス（.pdf拡張子付き）
 */
function selectOutputFile(filePath, dir) {
  if (!filePath) {
    const tmp = dir.substring(0, 251);
    return path.basename(tmp) + ".pdf";
  }

  return !filePath.endsWith(".pdf") ? filePath + ".pdf" : filePath;
}

/**
 * 入力が有効なディレクトリまたはzipファイルかを検証
 * @param {string} input - 検証対象のパス
 * @returns {boolean} 有効な場合はtrue、そうでない場合はfalse
 */
function isValidInput(input) {
  try {
    const stat = fs.statSync(input);
    return stat.isDirectory() || (stat.isFile() && input.endsWith(".zip"));
  } catch {
    return false;
  }
}

/**
 * ディレクトリ内のwebpファイルをjpgに変換
 * @param {string} dir - 処理対象のディレクトリパス
 * @returns {Promise<void>}
 */
async function convertWebp(dir) {
  logger.debug("convertWebp dir:" + dir);
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
              logger.debug("remove file: " + inputPath);
              fs.unlinkSync(inputPath);
            });
        });
      Promise.all(promiseAll)
        .then(() => resolve())
        .catch((error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * zipファイルが指定された場合は展開する（画像ファイルが含まれている場合のみ）
 * @param {string} dir - ディレクトリパスまたはzipファイルパス
 * @returns {Promise<{dir: string, zipPath: string|null}|null>} 展開ディレクトリとzipパス、または画像がない場合はnull
 */
async function extractZipIfNeeded(dir) {
  if (!dir.endsWith(".zip")) {
    return { dir: dir, zipPath: null };
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
    logger.info("No image files in zip, skipping extraction.");
    return null;
  }

  // 展開ディレクトリを作成
  const extractDir = path.join(path.dirname(dir), path.basename(dir, ".zip"));
  zip.extractAllTo(extractDir, true);
  logger.info(`Extracted zip to: ${extractDir}`);
  return { dir: extractDir, zipPath: dir };
}
