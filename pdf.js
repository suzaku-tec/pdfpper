const PDFDocument = require("pdfkit");
const imageSize = require("image-size");
const fs = require("fs");
const path = require("path");
const createLogger = require("./logger");

const logger = createLogger("info");

/**
 * PDF生成クラス
 * 画像ファイルをソートしてPDFドキュメントに追加します
 */
class Pdf {
  /**
   * 画像ファイル群をPDFに変換してファイルに出力
   * @param {string} outputDir - 画像ファイルが格納されているディレクトリ
   * @param {string} outputFile - 出力PDFファイルパス
   * @param {Array<{origin: string, padding: number}>} list - 画像ファイル情報の配列
   * @param {Function} callbackFn - PDF生成完了時に呼び出されるコールバック関数（ディレクトリパスを受け取る）
   * @param {Function} [progressFn] - ページ生成進捗通知用のコールバック（current, totalを受け取る）
   * @returns {Promise<void>}
   */
  async exportPdf(outputDir, outputFile, list, callbackFn, progressFn) {
    const doc = new PDFDocument({
      autoFirstPage: false,
    });

    const stream = doc.pipe(fs.createWriteStream(outputFile));
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

    const filePaths = result.map((fileObject) => {
      return outputDir.endsWith("/")
        ? outputDir + fileObject.origin
        : outputDir + "/" + fileObject.origin;
    });

    const totalPages = filePaths.length;
    logger.debug(`Generating PDF for ${totalPages} page(s)`);

    filePaths.forEach((filePath, index) => {
      const dimensions = imageSize(filePath);
      const pageNumber = index + 1;

      if (typeof progressFn === "function") {
        progressFn(pageNumber, totalPages);
      }

      doc.addPage({
        size: [dimensions.width, dimensions.height],
      });

      logger.debug(`Rendering page ${pageNumber}/${totalPages}: ${filePath}`);
      doc.image(filePath, 0, 0, {
        width: dimensions.width,
      });
    });

    await new Promise((resolve) => {
      stream.once("finish", () => {
        callbackFn(outputDir);
        resolve();
      });
      doc.end();
    });
  }
}

module.exports = Pdf;
