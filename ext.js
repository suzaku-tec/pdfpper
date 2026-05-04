const fs = require("fs");

/**
 * 拡張子管理クラス
 * ディレクトリ内のファイル拡張子を管理し、対象ファイルを取得します
 */
class Ext {
  /**
   * 拡張子を自動判別し、統一されているファイルを取得
   * @param {string} dir - ディレクトリパス
   * @param {string[]} files - ファイル名配列
   * @returns {Array<{origin: string, padding: number}>} 拡張子が統一されている場合はファイルオブジェクト配列、そうでない場合は空配列
   */
  autoExtList(dir, files) {
    // 拡張子のリストを作る
    const tmp_exts = files.map((file) => {
      return file.slice(((file.lastIndexOf(".") - 1) >>> 0) + 2);
    });
    const exts = Array.from(new Set(tmp_exts));

    if (exts && exts.length !== 1) {
      console.error("multi ext." + exts + " not auto collecting. dir:" + dir);
      return [];
    }

    return this.getExtList(dir, files, exts[0]);
  }

  /**
   * 指定された拡張子のファイルを取得
   * @param {string} dir - ディレクトリパス
   * @param {string[]} files - ファイル名配列
   * @param {string} ext - 対象拡張子
   * @returns {Array<{origin: string, padding: number}>} マッチしたファイルオブジェクト配列
   */
  getExtList(dir, files, ext) {
    return files
      .filter((fileName) => {
        const reg = new RegExp(".*." + ext + "$");
        return (
          fs.statSync(dir + "/" + fileName).isFile() && fileName.match(reg)
        );
      })
      .map((fileName) => {
        const padding = fileName.replace("." + ext, "");
        return {
          origin: fileName,
          padding: Number(padding),
        };
      });
  }
}

module.exports = Ext;
