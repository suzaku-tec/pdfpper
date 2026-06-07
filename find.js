#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");

const optionDefinitions = [
  {
    name: "dir",
    alias: "d",
    type: String,
    description: "検索対象ディレクトリを指定します",
  },
  {
    name: "find",
    type: String,
    description: "ファイル名またはフォルダ名の検索文字列を指定します",
  },
  {
    name: "out-list",
    type: String,
    description: "一致したパスを書き出す新規ファイルパスを指定します",
  },
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "ヘルプを表示します",
  },
];

const sections = [
  {
    header: "find.js",
    content:
      "指定したフォルダ内のファイル名・フォルダ名を検索し、結果を新規ファイルに書き出します。",
  },
  {
    header: "Options",
    optionList: optionDefinitions,
  },
];

function showHelp() {
  const usage = commandLineUsage(sections);
  console.log(usage);
}

function exitWithError(message) {
  console.error("Error: " + message);
  process.exit(1);
}

function validateOptions(options) {
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.dir) {
    exitWithError("-d, --dir オプションを指定してください。");
  }

  if (!options.find) {
    exitWithError("--find オプションを指定してください。");
  }

  if (!options["out-list"]) {
    exitWithError("--out-list オプションを指定してください。");
  }

  const targetDir = path.resolve(options.dir);

  if (!fs.existsSync(targetDir)) {
    exitWithError(`指定されたディレクトリが存在しません: ${targetDir}`);
  }

  if (!fs.statSync(targetDir).isDirectory()) {
    exitWithError(`指定されたパスはディレクトリではありません: ${targetDir}`);
  }

  const outputPath = path.resolve(options["out-list"]);
  if (fs.existsSync(outputPath)) {
    exitWithError(
      `出力ファイルが既に存在します。新規ファイルパスを指定してください: ${outputPath}`,
    );
  }

  return {
    dir: targetDir,
    findText: options.find,
    outputPath,
  };
}

function searchEntries(dir, findText) {
  const keyword = findText.toLowerCase();
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.name.toLowerCase().includes(keyword))
    .map((entry) => path.join(dir, entry.name));
}

function writeResults(outputPath, results) {
  const content = results.join("\n") + (results.length > 0 ? "\n" : "");
  fs.writeFileSync(outputPath, content, "utf8");
}

(async () => {
  const options = commandLineArgs(optionDefinitions);
  const { dir, findText, outputPath } = validateOptions(options);

  const matchingPaths = searchEntries(dir, findText);
  writeResults(outputPath, matchingPaths);

  console.log(`検索対象ディレクトリ: ${dir}`);
  console.log(`検索文字列: ${findText}`);
  console.log(`一致件数: ${matchingPaths.length}`);
  console.log(`出力ファイル: ${outputPath}`);
})();
