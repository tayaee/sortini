#!/usr/bin/env bash
set -e

# Version bump type: patch (default), minor, or major
BUMP_TYPE="${1:-patch}"

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Error: Invalid version type '$BUMP_TYPE'."
  echo "Usage: ./increment-version.sh [patch|minor|major]"
  exit 1
fi

OLD_VERSION=$(node -p "require('./package.json').version")

# Check git repository status
if git rev-parse --git-dir > /dev/null 2>&1; then
  # Automatically update package.json, create git commit, and git tag (e.g., v1.0.1)
  NEW_VERSION=$(npm version "$BUMP_TYPE" -m "release: %s")
  HAS_GIT=true
else
  NEW_VERSION=$(npm version "$BUMP_TYPE" --no-git-tag-version)
  HAS_GIT=false
fi

echo "=== Version Updated & Git Tagged ==="
echo "Previous Version : $OLD_VERSION"
echo "New Version      : $NEW_VERSION ($BUMP_TYPE)"

if [ "$HAS_GIT" = true ]; then
  echo "Git Tag Created  : $NEW_VERSION"
fi

echo ""
echo "Next steps:"
echo "  1. Push code and tags to GitHub : git push origin main --tags"
echo "  2. Publish updated package to npm : ./publish.sh"
