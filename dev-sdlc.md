# sortini - Developer & SDLC Guide

Developer lifecycle and architecture guide for `@tayaee/sortini`.

---

## 1. Project Architecture & Package Manager

`sortini` is a zero-dependency Node.js CLI utility.

This repository uses **`npm` (Maximum Compatibility Mode)** as its designated package manager to guarantee maximum backward compatibility across environments.

```
sortini/
├── .vscode/
│   ├── launch.json         # VS Code debug configurations (CLI & Test Debugging)
│   └── extensions.json     # Recommended VS Code extensions
├── bin/
│   └── sortini.js          # CLI entry point & argument parsing
├── lib/
│   ├── parser.js           # INI parsing, key=value formatting, sorting & comment alignment
│   └── diff.js             # Zero-dependency LCS Unified Diff generator
├── test/
│   └── test.js             # Automated test suite (npm test)
├── release.sh              # Unified 1-click release script (Syncs Git + npm)
├── increment-version.sh    # Version bump & git tagging helper
├── publish.sh              # npm publish helper
├── dev-sdlc.md             # SDLC developer guide
├── README.md               # User documentation
└── package.json            # Node.js & npm config ("packageManager": "npm@...", "engines": node>=12, npm>=6)
```

---

## 2. Prerequisites & VS Code Setup

- **Node.js**: `>=12.0.0` (`node -v`)
- **npm**: `>=6.0.0` (`npm -v`)
- **VS Code Debugging**: Press `F5` in VS Code to launch the Node.js debugger using pre-configured profiles in `.vscode/launch.json`:
  1. `Debug sortini CLI (-d test.ini)`: Debugs CLI execution with breakpoints.
  2. `Debug Unit Tests (npm test)`: Debugs test execution step-by-step.

---

## 3. Real-World Development & Release Walkthrough

### Step 1: Local Modifications & Verification
Edit code (`lib/parser.js`, `bin/sortini.js`, etc.) and verify locally:
```bash
npm test
node bin/sortini.js -v
```

### Step 2: One-Click Synchronized Release (Git + npm)
Run `./release.sh` to automatically test, bump version, create Git tag, push to GitHub, and publish to npm in perfect sync:
```bash
# Release a patch update (1.0.1 -> 1.0.2)
./release.sh

# Release a minor feature update (1.0.0 -> 1.1.0)
./release.sh minor
```

### Step 3: Verify Remote Execution
```bash
# Verify GitHub latest main branch
npx github:tayaee/sortini#main -v

# Verify npm latest published package
npx @tayaee/sortini@latest -v
```

---

## 4. Testing & Verification

Run the test suite:
```bash
npm test
```

---

## 5. Versioning Summary (SemVer)

- **`patch`** (`./release.sh patch`): Bug fixes / doc updates (`1.0.1 -> 1.0.2`).
- **`minor`** (`./release.sh minor`): New features (`1.0.0 -> 1.1.0`).
- **`major`** (`./release.sh major`): Breaking changes (`1.0.0 -> 2.0.0`).
