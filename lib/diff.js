'use strict';

/**
 * Computes LCS (Longest Common Subsequence) diff between two line arrays.
 *
 * @param {string[]} origLines
 * @param {string[]} newLines
 * @returns {Array<{type: string, value: string}>}
 */
function diffLines(origLines, newLines) {
  const N = origLines.length;
  const M = newLines.length;
  const dp = Array.from({ length: N + 1 }, () => new Int32Array(M + 1));

  for (let i = N - 1; i >= 0; i--) {
    for (let j = M - 1; j >= 0; j--) {
      if (origLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diff = [];
  let i = 0;
  let j = 0;

  while (i < N && j < M) {
    if (origLines[i] === newLines[j]) {
      diff.push({ type: ' ', value: origLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      diff.push({ type: '-', value: origLines[i] });
      i++;
    } else {
      diff.push({ type: '+', value: newLines[j] });
      j++;
    }
  }

  while (i < N) {
    diff.push({ type: '-', value: origLines[i] });
    i++;
  }

  while (j < M) {
    diff.push({ type: '+', value: newLines[j] });
    j++;
  }

  return diff;
}

/**
 * Formats original and sorted content into a Unified Diff string.
 *
 * @param {string} filePath - Path or label of target file
 * @param {string} originalContent - Original INI text
 * @param {string} sortedContent - Sorted INI text
 * @returns {string} - Unified diff text (empty string if identical)
 */
function formatUnifiedDiff(filePath, originalContent, sortedContent) {
  if (originalContent === sortedContent) {
    return '';
  }

  const origLines = originalContent.split(/\r?\n/);
  const newLines = sortedContent.split(/\r?\n/);

  const diffItems = diffLines(origLines, newLines);

  const lines = [];
  lines.push(`--- a/${filePath}`);
  lines.push(`+++ b/${filePath}`);
  lines.push(`@@ -1,${origLines.length} +1,${newLines.length} @@`);

  for (let k = 0; k < diffItems.length; k++) {
    const item = diffItems[k];
    lines.push(`${item.type}${item.value}`);
  }

  return lines.join('\n') + '\n';
}

module.exports = {
  formatUnifiedDiff
};
