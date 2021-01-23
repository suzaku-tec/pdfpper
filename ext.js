const fs = require("fs");

class Ext {
  autoExtList(dir, files) {
    // 拡張子のリストを作る
    const tmp_exts = files.map((file) => {
      return file.slice(((file.lastIndexOf(".") - 1) >>> 0) + 2);
    });
    const exts = Array.from(new Set(tmp_exts));
  
    if (exts && exts.length !== 1) {
      throw "multi ext. not auto collecting";
    }
  
    return this.getExtList(dir, files, exts[0]);
  }
  
  getExtList(dir, files, ext) {
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
  
}

module.exports = Ext
