#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { sortIniContent } = require('../lib/parser');
const { formatUnifiedDiff } = require('../lib/diff');

function printUsage() {
  console.log(`
Usage: npx @tayaee/sortini [OPTIONS] <FILE...>

Sorts INI file sections and keys to minimize diff noise.

Options:
  -i, --in-place       Sort files in place (default)
  --no-in-place        Print sorted output to stdout without modifying files
  -d, --diff           Print unified diff without modifying files (exits 1 if diff exists, 0 if sorted)
  -b, --backup         Create a backup (file-YYYYmmdd-HHMMSS.ini) before in-place edit
  --no-backup          Do not create a backup file (default)
  -e, --encoding <enc>     File encoding: 'auto' (default), 'utf-8', 'latin1', 'utf16le', etc.
  -n, --newline-format <fmt> Newline format: 'windows' (default, CRLF), 'linux' (LF), 'macos' (CR)
  -h, --help           Show help message
  -v, --version        Show version number

Exit Status:
  In-place / Stdout mode:
    0  Success or file already sorted.
    1  File error, permission denied, invalid arguments, or internal failure.

  Diff mode (-d, --diff):
    0  File is already sorted (no diff).
    1  File needs sorting (diff printed) or error occurred.

Examples:
  npx @tayaee/sortini config.ini                       # In-place sort, no backup, auto-encoding
  npx @tayaee/sortini -d config.ini                    # Preview diff (exit 1 if changes needed, 0 if sorted)
  npx @tayaee/sortini -b config.ini                    # In-place sort with backup
  npx @tayaee/sortini --no-in-place config.ini         # Print sorted content to stdout
`.trim());
}

function printVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    console.log(`${pkg.name} v${pkg.version}`);
  } catch (err) {
    console.log('@tayaee/sortini v1.0.0');
  }
}

function formatTimestamp(date) {
  const pad = (num) => String(num).padStart(2, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const SS = pad(date.getSeconds());
  return `${YYYY}${MM}${DD}-${HH}${mm}${SS}`;
}

function generateBackupPath(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const timestamp = formatTimestamp(new Date());
  const backupName = `${name}-${timestamp}${ext}`;
  return path.join(dir, backupName);
}

function readFileWithEncoding(filePath, requestedEncoding) {
  const buf = fs.readFileSync(filePath);
  let encoding = requestedEncoding;
  let hasBom = false;
  let bomBuffer = null;

  if (requestedEncoding === 'auto') {
    // Detect Byte Order Mark (BOM)
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
      encoding = 'utf-8';
      hasBom = true;
      bomBuffer = Buffer.from([0xEF, 0xBB, 0xBF]);
    } else if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
      encoding = 'utf16le';
      hasBom = true;
      bomBuffer = Buffer.from([0xFF, 0xFE]);
    } else {
      encoding = 'utf-8';
    }
  }

  const contentBuffer = hasBom ? buf.subarray(bomBuffer.length) : buf;
  const textContent = contentBuffer.toString(encoding);

  return {
    content: textContent,
    encoding: encoding,
    hasBom: hasBom,
    bomBuffer: bomBuffer
  };
}

function writeFileWithEncoding(filePath, textContent, encodingMeta) {
  const { encoding, hasBom, bomBuffer } = encodingMeta;
  const contentBuf = Buffer.from(textContent, encoding);
  
  if (hasBom && bomBuffer) {
    const finalBuf = Buffer.concat([bomBuffer, contentBuf]);
    fs.writeFileSync(filePath, finalBuf);
  } else {
    fs.writeFileSync(filePath, contentBuf);
  }
}

function parseArgs(args) {
  let inPlace = true; // Default: --in-place
  let diffMode = false;
  let backup = false; // Default: --no-backup
  let backupExplicit = false;
  let encoding = 'auto'; // Default: auto
  let newlineFormat = 'windows'; // Default: windows
  const files = [];

  const validNewlineFormats = ['linux', 'windows', 'macos'];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    } else if (arg === '-v' || arg === '--version') {
      printVersion();
      process.exit(0);
    } else if (arg === '-d' || arg === '--diff') {
      diffMode = true;
    } else if (arg === '-i' || arg === '--in-place') {
      inPlace = true;
    } else if (arg === '--no-in-place') {
      inPlace = false;
    } else if (arg === '-b' || arg === '--backup') {
      backup = true;
      backupExplicit = true;
    } else if (arg === '--no-backup') {
      backup = false;
      backupExplicit = true;
    } else if (arg === '-e' || arg === '--encoding') {
      if (i + 1 >= args.length) {
        console.error('Error: Option --encoding requires an argument.');
        process.exit(1);
      }
      encoding = args[++i];
    } else if (arg.startsWith('--encoding=')) {
      encoding = arg.split('=')[1];
    } else if (arg === '-n' || arg === '--newline-format') {
      if (i + 1 >= args.length) {
        console.error('Error: Option --newline-format requires an argument.');
        process.exit(1);
      }
      newlineFormat = args[++i];
      if (!validNewlineFormats.includes(newlineFormat)) {
        console.error(`Error: Invalid --newline-format '${newlineFormat}'. Allowed values: linux, windows, macos.`);
        process.exit(1);
      }
    } else if (arg.startsWith('--newline-format=')) {
      newlineFormat = arg.split('=')[1];
      if (!validNewlineFormats.includes(newlineFormat)) {
        console.error(`Error: Invalid --newline-format '${newlineFormat}'. Allowed values: linux, windows, macos.`);
        process.exit(1);
      }
    } else if (arg.startsWith('-')) {
      console.error(`Error: Unknown option '${arg}'.`);
      printUsage();
      process.exit(1);
    } else {
      files.push(arg);
    }
  }

  return { inPlace, diffMode, backup, backupExplicit, encoding, newlineFormat, files };
}

function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0) {
    printUsage();
    process.exit(1);
  }

  const { inPlace, diffMode, backup, backupExplicit, encoding, newlineFormat, files } = parseArgs(rawArgs);

  if (backup && !inPlace && !diffMode) {
    console.error('Error: Option --backup (-b) can only be used with --in-place (-i).');
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('Error: No input files specified.');
    process.exit(1);
  }

  let hasError = false;
  let diffFound = false;

  for (const filePath of files) {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    try {
      if (!fs.existsSync(resolvedPath)) {
        console.error(`Error: File not found '${filePath}'`);
        hasError = true;
        continue;
      }

      const fileMeta = readFileWithEncoding(resolvedPath, encoding);
      const sortedContent = sortIniContent(fileMeta.content, newlineFormat);

      if (diffMode) {
        // Output diff without modifying file
        const diffText = formatUnifiedDiff(filePath, fileMeta.content, sortedContent);
        if (diffText) {
          process.stdout.write(diffText);
          diffFound = true;
        }
      } else if (inPlace) {
        // Skip overwrite if file is already sorted
        const isAlreadySorted = (sortedContent === fileMeta.content);
        if (!isAlreadySorted) {
          if (backup) {
            const backupPath = generateBackupPath(resolvedPath);
            fs.copyFileSync(resolvedPath, backupPath);
          }
          writeFileWithEncoding(resolvedPath, sortedContent, fileMeta);
        }
      } else {
        // Output to stdout
        process.stdout.write(sortedContent);
      }
    } catch (err) {
      console.error(`Error processing '${filePath}': ${err.message}`);
      hasError = true;
    }
  }

  if (hasError) {
    process.exit(1);
  } else if (diffMode && diffFound) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
