# @tayaee/sortini

`@tayaee/sortini` is a **zero-dependency CLI utility that sorts INI file sections and keys to minimize diff noise**. Built for maximum compatibility across Node.js versions (v12+).

---

## 🚀 Quickstart

Run directly via `npx` (defaults to **in-place edit**, **no backup**, and **auto-encoding**):

```bash
# In-place sort (latest version)
npx @tayaee/sortini config.ini

# Run specific package version from npm
npx @tayaee/sortini@1.0.0 config.ini
npx @tayaee/sortini@1.0.1 config.ini

# Preview changes as unified diff without modifying files
npx @tayaee/sortini -d config.ini

# Sort in-place and create a backup (config-YYYYmmdd-HHMMSS.ini)
npx @tayaee/sortini -b config.ini

# Print sorted output to stdout without modifying files
npx @tayaee/sortini --no-in-place config.ini
```

### Direct GitHub Execution & Specific Version Tags
```bash
# Latest main branch
npx github:tayaee/sortini config.ini

# Specific Git version tags
npx github:tayaee/sortini#v1.0.0 config.ini
npx github:tayaee/sortini#v1.0.1 config.ini
```

---

## 📌 Sorting & Formatting Rules

1. **`key=value` Formatting**: Strips spaces around `=` into a clean `key=value` format.
2. **Global Parameters**: Key-value pairs before any `[section]` stay at the top, sorted alphabetically.
3. **Alphabetical Sorting**: Section headers (`[section]`) and keys within each section are sorted alphabetically (A-Z).
4. **Inline Comment Column Alignment**: Inline comments (`;` or `#`) are aligned to column stops **40 ➔ 60 ➔ 80 ➔ min 2 spaces** (respects quotes).
5. **Standalone Comment Preservation**: Comments attached above items/sections are preserved with internal blank lines stripped.
6. **Section Spacing**: Exactly 1 blank line is placed between sections for clean readability.

---

## ⚙️ CLI Options

| Option | Short | Description |
| --- | --- | --- |
| `--in-place` | `-i` | Sort input files in place (default) |
| `--no-in-place` | - | Print sorted output to stdout without modifying files |
| `--diff` | `-d` | Print unified diff without modifying files (exits 1 if diff exists, 0 if sorted) |
| `--backup` | `-b` | Create a backup (`file-YYYYmmdd-HHMMSS.ini`) before editing in-place |
| `--no-backup` | - | Do not create a backup file (default) |
| `--encoding <enc>` | `-e` | File encoding: `auto` (default, preserves BOM), `utf-8`, `latin1`, `utf16le` |
| `--help` | `-h` | Display help message |
| `--version` | `-v` | Display version number |

---

## 🚦 Exit Status

| Mode | Exit Code | Condition |
| --- | --- | --- |
| **Normal Mode** (`--in-place`, `--no-in-place`) | **`0`** | Success or file already sorted |
| | **`1`** | File error, permission denied, invalid args, or internal failure |
| **Diff Mode** (`-d`, `--diff`) | **`0`** | **File is already sorted (no diff)** |
| | **`1`** | **File needs sorting (diff printed)** or error occurred |

---

## 📄 License

[MIT License](LICENSE)
