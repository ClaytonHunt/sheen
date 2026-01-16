#!/bin/bash

# Sheen Smoke Tests

echo "========================================"
echo "  Sheen v0.1.0 Smoke Tests"
echo "========================================"
echo ""

PASSED=0
FAILED=0

# Test 1: Version
echo "[TEST 1] sheen --version"
VERSION=$(sheen --version 2>&1)
if [ "$VERSION" = "0.1.0" ]; then
  echo "✓ PASS: Version returns 0.1.0"
  ((PASSED++))
else
  echo "✗ FAIL: Expected 0.1.0, got $VERSION"
  ((FAILED++))
fi
echo ""

# Test 2: Help
echo "[TEST 2] sheen --help"
if sheen --help 2>&1 | grep -q "Autonomous coding agent"; then
  echo "✓ PASS: Help displays correctly"
  ((PASSED++))
else
  echo "✗ FAIL: Help output missing expected text"
  ((FAILED++))
fi
echo ""

# Test 3: Init in empty directory
echo "[TEST 3] sheen init in empty directory"
TEST_DIR="/tmp/sheen-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
if sheen init "Test" 2>&1 | grep -q "Created .sheen/ directory"; then
  if [ -f ".sheen/plan.md" ] && [ -f ".sheen/context.md" ] && [ -f ".sheen/config.json" ]; then
    echo "✓ PASS: .sheen/ directory created successfully"
    ((PASSED++))
  else
    echo "✗ FAIL: .sheen/ files missing"
    ((FAILED++))
  fi
else
  echo "✗ FAIL: Init command failed"
  ((FAILED++))
fi
cd - > /dev/null
rm -rf "$TEST_DIR"
echo ""

# Test 4: Project detection (Node.js)
echo "[TEST 4] Project detection for Node.js"
cd /d/projects/sheen
if sheen init 2>&1 | grep -q "nodejs project"; then
  echo "✓ PASS: Correctly detected Node.js project"
  ((PASSED++))
else
  echo "✗ FAIL: Failed to detect Node.js project"
  ((FAILED++))
fi
echo ""

# Test 5: Build succeeds
echo "[TEST 5] npm run build"
if npm run build > /dev/null 2>&1; then
  echo "✓ PASS: TypeScript builds successfully"
  ((PASSED++))
else
  echo "✗ FAIL: Build failed"
  ((FAILED++))
fi
echo ""

echo "========================================"
echo "  Results: $PASSED passed, $FAILED failed"
echo "========================================"

if [ $FAILED -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
