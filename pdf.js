const PDFDocument = require("pdfkit");
const imageSize = require("image-size");
const fs = require("fs");

class Pdf {
  async exportPdf(outputDir, outputFile, list, callbackFn) {
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

    result
      .map((fileObject) => {
        return outputDir.endsWith("/")
          ? outputDir + fileObject.origin
          : outputDir + "/" + fileObject.origin;
      })
      .forEach((filePath) => {
        const dimensions = imageSize(filePath);

        doc.addPage({
          size: [dimensions.width, dimensions.height],
        });

        console.log(filePath);
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
