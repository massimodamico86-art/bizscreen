#!/bin/bash

# BizScreen Android TV Player - Build Script
# Uses Docker to build the APK without requiring local Android SDK

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "BizScreen Android TV Player - Build"
echo "=========================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Build type (debug or release)
BUILD_TYPE="${1:-debug}"

echo "Build type: $BUILD_TYPE"
echo ""

# Build Docker image
echo "Building Docker image with Android SDK..."
docker build -t bizscreen-android-builder . || {
    echo "Failed to build Docker image"
    exit 1
}

echo ""
echo "Building APK..."

# Run the build
docker run --rm \
    -v "$SCRIPT_DIR":/app \
    -w /app \
    bizscreen-android-builder \
    ./gradlew "assemble${BUILD_TYPE^}" --no-daemon

echo ""
echo "=========================================="
echo "Build complete!"
echo ""

# Find and display the APK location
APK_DIR="app/build/outputs/apk/$BUILD_TYPE"
if [ -d "$APK_DIR" ]; then
    echo "APK location:"
    find "$APK_DIR" -name "*.apk" -type f
else
    echo "APK directory not found at: $APK_DIR"
fi

echo ""
echo "To install on Fire TV:"
echo "  adb connect <fire-tv-ip>:5555"
echo "  adb install -r $APK_DIR/app-$BUILD_TYPE.apk"
echo "=========================================="
