'use strict';

/**
 * Splits a line into key-value part and inline comment part.
 * Preserves semicolons or hashes inside quotes (" or ').
 *
 * @param {string} line
 * @returns {{hasInlineComment: boolean, kvPart: string, commentPart: string}}
 */
function splitInlineComment(line) {
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (!inDouble && !inSingle && (ch === ';' || ch === '#')) {
      const kvPart = line.substring(0, i).trimEnd();
      const commentPart = line.substring(i).trimStart();
      return { hasInlineComment: true, kvPart, commentPart };
    }
  }
  return { hasInlineComment: false, kvPart: line, commentPart: '' };
}

/**
 * Formats a key-value line to key=value without spaces around '='
 * and aligns inline comments at column stops 40, 60, 80, or min 2 spaces.
 *
 * @param {string} rawLine
 * @returns {string}
 */
function formatLine(rawLine) {
  const { hasInlineComment, kvPart, commentPart } = splitInlineComment(rawLine);

  let formattedKv = kvPart;
  const eqIdx = kvPart.indexOf('=');

  // Format as key=value (strip spaces around '=')
  if (eqIdx !== -1) {
    const k = kvPart.substring(0, eqIdx).trim();
    const v = kvPart.substring(eqIdx + 1).trim();
    formattedKv = `${k}=${v}`;
  }

  if (!hasInlineComment) {
    return formattedKv;
  }

  const kvLen = formattedKv.length;
  const minPos = kvLen + 3; // 1-indexed column position with >= 2 spaces padding

  let targetCol = 40;
  if (minPos <= 40) {
    targetCol = 40;
  } else if (minPos <= 60) {
    targetCol = 60;
  } else if (minPos <= 80) {
    targetCol = 80;
  } else {
    targetCol = minPos;
  }

  const spacesNeeded = Math.max(2, targetCol - 1 - kvLen);
  const padding = ' '.repeat(spacesNeeded);

  return `${formattedKv}${padding}${commentPart}`;
}

/**
 * Parses and sorts INI content.
 * 
 * Rules:
 * 1. Global key-value entries stay at the top.
 * 2. Section headers are sorted alphabetically.
 * 3. Key-value pairs inside each section are sorted alphabetically.
 * 4. Key-value pairs are formatted as key=value.
 * 5. Standalone comments above items/sections are preserved directly above them.
 * 6. Blank lines within leading comments are stripped.
 * 7. Exactly 1 blank line is inserted between sections.
 * 8. Inline comments are column-aligned to 40, 60, 80, or min 2 spaces.
 *
 * @param {string} content - Raw content of INI file
 * @returns {string} - Sorted INI content
 */
function sortIniContent(content) {
  // Detect line ending (\r\n or \n)
  const isCrlf = content.includes('\r\n');
  const eol = isCrlf ? '\r\n' : '\n';

  const lines = content.split(/\r?\n/);

  // Global section (before first [section])
  const globalSection = {
    headerComments: [],
    items: []
  };

  const sections = [];
  let currentSection = globalSection;
  let currentComments = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Collect comment or blank line
    if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('#')) {
      currentComments.push(rawLine);
      continue;
    }

    // Handle section header [SectionName]
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();
      currentSection = {
        name: sectionName,
        rawHeader: rawLine,
        headerComments: currentComments,
        items: []
      };
      sections.push(currentSection);
      currentComments = [];
      continue;
    }

    // Handle Key-Value pair
    const formattedLine = formatLine(rawLine);
    let key = trimmed;
    const kvMatch = trimmed.match(/^([^=:]+)/);
    if (kvMatch) {
      key = kvMatch[1].trim();
    }

    currentSection.items.push({
      key: key,
      rawLine: formattedLine,
      comments: currentComments
    });
    currentComments = [];
  }

  const trailingComments = currentComments;

  // 1. Sort global section items
  globalSection.items.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: 'base', numeric: true }));

  // 2. Sort section headers
  sections.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

  // 3. Sort items within each section
  sections.forEach(sec => {
    sec.items.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: 'base', numeric: true }));
  });

  // Reconstruct sorted output
  const outputLines = [];

  function appendComments(arr) {
    for (let j = 0; j < arr.length; j++) {
      if (arr[j].trim() !== '') {
        outputLines.push(arr[j]);
      }
    }
  }

  // Output global section
  appendComments(globalSection.headerComments);
  globalSection.items.forEach(item => {
    appendComments(item.comments);
    outputLines.push(item.rawLine);
  });

  // Output sections with 1 blank line spacing
  sections.forEach(sec => {
    if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
      outputLines.push('');
    }
    appendComments(sec.headerComments);
    outputLines.push(sec.rawHeader);
    sec.items.forEach(item => {
      appendComments(item.comments);
      outputLines.push(item.rawLine);
    });
  });

  // Output trailing comments
  if (trailingComments.some(c => c.trim() !== '')) {
    if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
      outputLines.push('');
    }
    appendComments(trailingComments);
  }

  return outputLines.join(eol);
}

module.exports = {
  sortIniContent,
  formatInlineCommentLine: formatLine
};
