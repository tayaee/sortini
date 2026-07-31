#!/usr/bin/env bash
set -e

echo "=== Starting @tayaee/sortini Release & Publish Process ==="

# 1. Run automated test suite
echo "--> Running automated unit tests..."
npm test

# 2. Check npm authentication
echo "--> Checking npm authentication..."
if ! npm whoami > /dev/null 2>&1; then
  echo "Error: You are not logged into npm."
  echo "Please run 'npm login' first, then re-run ./publish.sh."
  exit 1
fi

NPM_USER=$(npm whoami)
echo "--> Logged into npm as: $NPM_USER"

# 3. Publish package to npm
echo "--> Publishing @tayaee/sortini to npm..."
npm publish --access public

echo "=== Successfully published @tayaee/sortini to npm! ==="
echo "Users can now run: npx @tayaee/sortini [options] <file...>"
