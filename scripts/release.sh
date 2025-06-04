#!/bin/bash

# Release script for lightweight-mysql-orm
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "Error: Working directory is not clean. Please commit your changes first."
    exit 1
fi

# Get the version type (default to patch)
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Version type must be one of: patch, minor, major"
    echo "Usage: $0 [patch|minor|major]"
    exit 1
fi

echo "🚀 Starting release process..."

# Make sure we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo "Warning: You're not on main/master branch. Current branch: $CURRENT_BRANCH"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Release cancelled."
        exit 1
    fi
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin $CURRENT_BRANCH

# Run tests if they exist
echo "🧪 Running tests..."
npm test --if-present

# Build the project
echo "🔨 Building project..."
npm run build

# Bump version and create tag
echo "📝 Bumping $VERSION_TYPE version..."
npm version $VERSION_TYPE

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ Version bumped to v$NEW_VERSION"

echo "🎉 Release process completed!"
echo "📦 The GitHub Action will automatically publish to NPM when the tag is pushed."
echo "🔗 Check the progress at: https://github.com/thinhbuzz/lightweight-mysql-orm/actions" 