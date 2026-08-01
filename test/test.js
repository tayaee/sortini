'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { sortIniContent, formatInlineCommentLine } = require('../lib/parser');
const { formatUnifiedDiff } = require('../lib/diff');

console.log('Running sortini unit tests...');

// 1. Basic sorting test (key=value format without spaces around =)
{
  const input = `
[database]
host = localhost
port = 5432
adapter = postgresql

[app]
title = My App
env = production
debug = false
`;

  const expected = `[app]
debug=false
env=production
title=My App

[database]
adapter=postgresql
host=localhost
port=5432`;

  const result = sortIniContent(input, 'linux');
  assert.strictEqual(result.trim(), expected.trim(), 'Basic sorting failed');
  console.log('✓ Basic section and key sorting (key=value format) passed');
}

// 2. Global parameters and comments preservation test
{
  const input = `; Global config
app_name = Sortini
# Global version
version = 1.0.0

; Database section
[database]
# DB User
user = root
# DB Host
host = localhost
`;

  const expected = `; Global config
app_name=Sortini
# Global version
version=1.0.0

; Database section
[database]
# DB Host
host=localhost
# DB User
user=root`;

  const result = sortIniContent(input, 'linux');
  assert.strictEqual(result.trim(), expected.trim(), 'Comments preservation test failed');
  console.log('✓ Comments and global params preservation passed');
}

// 3. Section comments with alternating blank lines & 1 blank line between sections test
{
  const input = `[zebra]
z = 100

; comment 1

; comment 2

# comment 3
[apple]
a = 1
`;

  const expected = `; comment 1
; comment 2
# comment 3
[apple]
a=1

[zebra]
z=100`;

  const result = sortIniContent(input, 'linux');
  assert.strictEqual(result.trim(), expected.trim(), 'Section comments and section spacing failed');
  console.log('✓ Section comments (blank lines stripped) and 1 blank line between sections passed');
}

// 4. Item comments with alternating blank lines test
{
  const input = `[server]
port = 8080

; item comment 1

; item comment 2

# item comment 3
host = 127.0.0.1
`;

  const expected = `[server]
; item comment 1
; item comment 2
# item comment 3
host=127.0.0.1
port=8080`;

  const result = sortIniContent(input, 'linux');
  assert.strictEqual(result.trim(), expected.trim(), 'Item comments (blank lines stripped) failed');
  console.log('✓ Item comments (alternating blank lines stripped) attached directly above item passed');
}

// 5. Inline comments column alignment (40, 60, 80, min 2 spaces) test with key=value format
{
  // Test Column 40 alignment
  const line1 = 'port = 5432 ; DB Port';
  const formatted1 = formatInlineCommentLine(line1);
  assert.ok(formatted1.startsWith('port=5432'), 'Should format as key=value without spaces around =');
  assert.strictEqual(formatted1.indexOf(';'), 39, 'Inline comment should start at 1-indexed column 40 (index 39)');

  // Test Column 60 alignment
  const line2 = 'long_setting_key_name_val = "production_mode" ; Mode';
  const formatted2 = formatInlineCommentLine(line2);
  assert.ok(formatted2.startsWith('long_setting_key_name_val="production_mode"'));
  assert.strictEqual(formatted2.indexOf(';'), 59, 'Inline comment should start at 1-indexed column 60 (index 59)');

  // Test Column 80 alignment
  const line3 = 'ultra_super_long_setting_key_name_value_for_testing_purpose = 1234567 ; Test';
  const formatted3 = formatInlineCommentLine(line3);
  assert.ok(formatted3.startsWith('ultra_super_long_setting_key_name_value_for_testing_purpose=1234567'));
  assert.strictEqual(formatted3.indexOf(';'), 79, 'Inline comment should start at 1-indexed column 80 (index 79)');

  // Test overflow > 80 (min 2 spaces)
  const line4 = 'super_long_key_and_value_that_exceeds_eighty_characters_in_total_length = true ; Overflow';
  const formatted4 = formatInlineCommentLine(line4);
  assert.ok(formatted4.includes('  ; Overflow'), 'Overflow comment should have 2 spaces padding');

  // Test quotes handling (semicolon inside quotes should not split)
  const line5 = 'key = "val;with;semicolon" ; Real Comment';
  const formatted5 = formatInlineCommentLine(line5);
  assert.ok(formatted5.startsWith('key="val;with;semicolon"'));
  assert.strictEqual(formatted5.indexOf('; Real Comment'), 39, 'Comment inside quotes should be ignored when finding inline comment');

  console.log('✓ Inline comment column alignment (40/60/80/overflow) & key=value format passed');
}

// 6. CLI Version verification test (-v / --version)
{
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const versionOutput = execSync('node bin/sortini.js -v', { encoding: 'utf-8' }).trim();
  assert.strictEqual(versionOutput, `${pkg.name} v${pkg.version}`, '-v output should match package.json name and version');

  const longVersionOutput = execSync('node bin/sortini.js --version', { encoding: 'utf-8' }).trim();
  assert.strictEqual(longVersionOutput, `${pkg.name} v${pkg.version}`, '--version output should match package.json name and version');
  console.log('✓ CLI version output (-v and --version) verification passed');
}

// 7. CLI execution & Exit code tests
{
  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const sampleFile = path.join(tmpDir, 'test.ini');
  const unsortedContent = `[zebra]\nz=1\na=2\n[apple]\nb=3\na=4\n`;
  const sortedContent = `[apple]\r\na=4\r\nb=3\r\n\r\n[zebra]\r\na=2\r\nz=1\r\n\r\n`;

  // Write unsorted content
  fs.writeFileSync(sampleFile, unsortedContent, 'utf-8');

  // Test 1: -d / --diff on unsorted file -> should print diff AND exit with code 1
  try {
    execSync(`node bin/sortini.js -d "${sampleFile}"`, { stdio: 'pipe' });
    assert.fail('Should exit with code 1 when diff is found in diff mode');
  } catch (err) {
    assert.strictEqual(err.status, 1, 'Exit status should be 1 when diff exists');
    const stdout = err.stdout.toString();
    assert.ok(stdout.includes('--- a/'), 'Diff output should contain --- header');
    assert.ok(stdout.includes('+++ b/'), 'Diff output should contain +++ header');
    assert.ok(stdout.includes('-[zebra]'), 'Diff output should contain removed line');
    console.log('✓ -d / --diff on unsorted file -> Diff printed & exit status 1 passed');
  }
  assert.strictEqual(fs.readFileSync(sampleFile, 'utf-8'), unsortedContent, 'File must NOT be modified during -d / --diff');

  // Test 2: Sorting required -> sorts file and returns exit code 0
  execSync(`node bin/sortini.js "${sampleFile}"`);
  const updatedContent = fs.readFileSync(sampleFile, 'utf-8');
  assert.strictEqual(updatedContent, sortedContent, 'In-place sorting should match expected content with visible trailing blank line');
  console.log('✓ Unsorted file -> In-place sort success (exit code 0)');

  // Test 3: --diff on ALREADY sorted file -> empty output & exit code 0
  const diffSorted = execSync(`node bin/sortini.js --diff "${sampleFile}"`, { encoding: 'utf-8' });
  assert.strictEqual(diffSorted, '', 'Diff on already sorted file should be empty');
  console.log('✓ --diff on already sorted file -> Empty output & exit status 0 passed');

  // Test 4: File ALREADY sorted -> returns exit code 0, file unchanged, no backup created even with -b
  execSync(`node bin/sortini.js -b "${sampleFile}"`);
  const filesInTmp = fs.readdirSync(tmpDir);
  const createdBackup = filesInTmp.find(f => /^test-\d{8}-\d{6}\.ini$/.test(f));
  assert.ok(!createdBackup, 'No backup file should be created if file was already sorted');
  console.log('✓ Already-sorted file -> No-op, no backup created, exit code 0');

  // Test 5: Exception (non-existent file) -> exit code 1
  try {
    execSync(`node bin/sortini.js "${path.join(tmpDir, 'nonexistent.ini')}"`, { stdio: 'pipe' });
    assert.fail('Should fail on non-existent file');
  } catch (err) {
    assert.strictEqual(err.status, 1, 'File non-existent error exit code should be 1');
    console.log('✓ Non-existent file / exception -> exit code 1');
  }

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// 8. Trailing visible blank line test
{
  const input = `[section]\nkey=val`;
  const result = sortIniContent(input);
  assert.ok(result.endsWith('\n\n') || result.endsWith('\r\n\r\n'), 'Sorted INI content should end with a visible blank line');
  console.log('✓ Trailing visible blank line at the end of output passed');
}

// 9. Newline format options test (--newline-format linux|windows|macos)
{
  const input = `[b]\n2=two\n[a]\n1=one`;

  // Default option -> CRLF (\r\n)
  const defaultResult = sortIniContent(input);
  assert.ok(defaultResult.includes('[a]\r\n1=one\r\n\r\n[b]'), 'default format should use \\r\\n (windows)');
  assert.ok(defaultResult.endsWith('\r\n\r\n'), 'default format should end with \\r\\n\\r\\n');

  // linux option -> LF (\n)
  const linuxResult = sortIniContent(input, 'linux');
  assert.ok(linuxResult.includes('[a]\n1=one\n\n[b]'), 'linux format should use \\n');
  assert.ok(linuxResult.endsWith('\n\n'), 'linux format should end with \\n\\n');

  // windows option -> CRLF (\r\n)
  const windowsResult = sortIniContent(input, 'windows');
  assert.ok(windowsResult.includes('[a]\r\n1=one\r\n\r\n[b]'), 'windows format should use \\r\\n');
  assert.ok(windowsResult.endsWith('\r\n\r\n'), 'windows format should end with \\r\\n\\r\\n');

  // macos option -> CR (\r)
  const macosResult = sortIniContent(input, 'macos');
  assert.ok(macosResult.includes('[a]\r1=one\r\r[b]'), 'macos format should use \\r');
  assert.ok(macosResult.endsWith('\r\r'), 'macos format should end with \\r\\r');

  // CLI execution test with --newline-format
  const tmpDir = path.join(__dirname, 'tmp_nl');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const sampleFile = path.join(tmpDir, 'sample_nl.ini');
  fs.writeFileSync(sampleFile, input, 'utf-8');

  // CLI default (windows CRLF)
  execSync(`node bin/sortini.js "${sampleFile}"`);
  const defaultFileContent = fs.readFileSync(sampleFile, 'utf-8');
  assert.ok(defaultFileContent.endsWith('\r\n\r\n'), 'CLI default should produce CRLF line endings');

  // CLI --newline-format linux
  execSync(`node bin/sortini.js --newline-format linux "${sampleFile}"`);
  const linuxFileContent = fs.readFileSync(sampleFile, 'utf-8');
  assert.ok(linuxFileContent.endsWith('\n\n') && !linuxFileContent.includes('\r'), 'CLI --newline-format linux should produce LF line endings');

  // CLI --newline-format windows
  execSync(`node bin/sortini.js --newline-format windows "${sampleFile}"`);
  const windowsFileContent = fs.readFileSync(sampleFile, 'utf-8');
  assert.ok(windowsFileContent.endsWith('\r\n\r\n'), 'CLI --newline-format windows should produce CRLF line endings');

  // CLI --newline-format macos
  execSync(`node bin/sortini.js -n macos "${sampleFile}"`);
  const macosFileContent = fs.readFileSync(sampleFile, 'utf-8');
  assert.ok(macosFileContent.endsWith('\r\r') && !macosFileContent.includes('\n'), 'CLI -n macos should produce CR line endings');

  // Invalid format test -> exit status 1
  try {
    execSync(`node bin/sortini.js --newline-format invalid "${sampleFile}"`, { stdio: 'pipe' });
    assert.fail('Should fail on invalid --newline-format');
  } catch (err) {
    assert.strictEqual(err.status, 1, 'Invalid --newline-format exit status should be 1');
  }

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('✓ --newline-format linux|windows|macos options passed');
}

console.log('\nAll tests completed successfully!');
