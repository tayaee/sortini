#!/usr/bin/env bash
set -e

BUMP_TYPE="${1:-patch}"

echo "=== Starting Synchronized Release Process ($BUMP_TYPE) ==="

# 1. Run automated test suite
echo "--> Step 1/4: Running automated tests..."
npm test

# 2. Increment version and create Git commit & tag
echo "--> Step 2/4: Updating version and creating Git tag..."
./increment-version.sh "$BUMP_TYPE"

NEW_VERSION=$(node -p "require('./package.json').version")

# 3. Push code and tags to GitHub
echo "--> Step 3/4: Pushing code and tags to GitHub..."
git push origin main --tags

# 4. Check npm login and publish to npm registry
echo "--> Step 4/4: Publishing v$NEW_VERSION to npm..."
if ! npm whoami > /dev/null 2>&1; then
  echo "Error: You are not logged into npm."
  echo "Please run 'npm login' first, then re-run ./release.sh."
  exit 1
fi

npm publish --access public

echo ""
echo "=== Release v$NEW_VERSION Successfully Synchronized & Published! ==="
echo "GitHub Tag : v$NEW_VERSION"
echo "npm Version: @tayaee/sortini@$NEW_VERSION"
echo "Run via npx: npx @tayaee/sortini@latest [options] <file...>"
