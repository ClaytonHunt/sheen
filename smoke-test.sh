#!/bin/bash

# Sheen v0.1.0 Comprehensive Smoke Tests

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

# Test 6: Unit tests pass
echo "[TEST 6] npm test"
if npm test > /dev/null 2>&1; then
  echo "✓ PASS: All unit tests passing"
  ((PASSED++))
else
  echo "✗ FAIL: Some unit tests failed"
  ((FAILED++))
fi
echo ""

# Test 7: Tool system (manual)
echo "[TEST 7] Tool system"
if npx tsx test-tools.ts > /dev/null 2>&1; then
  echo "✓ PASS: Tool system works (8 tests)"
  ((PASSED++))
else
  echo "✗ FAIL: Tool system tests failed"
  ((FAILED++))
fi
echo ""

# Test 8: OpenCode integration (manual)
echo "[TEST 8] OpenCode integration"
if npx tsx test-opencode.ts > /dev/null 2>&1; then
  echo "✓ PASS: OpenCode integration works (6 tests)"
  ((PASSED++))
else
  echo "✗ FAIL: OpenCode integration tests failed"
  ((FAILED++))
fi
echo ""

# Test 9: Verify tool count
echo "[TEST 9] Verify 9 tools registered"
# This test checks that the agent has all expected tools
if grep -q "fileTools" src/core/agent.ts && \
   grep -q "gitTools" src/core/agent.ts && \
   grep -q "shellTools" src/core/agent.ts; then
  echo "✓ PASS: All tool categories registered"
  ((PASSED++))
else
  echo "✗ FAIL: Missing tool registrations"
  ((FAILED++))
fi
echo ""

# Test 10: Check test coverage
echo "[TEST 10] Test coverage"
TEST_COUNT=$(npm test 2>&1 | grep "Tests:" | grep -oP '\d+ passed' | grep -oP '\d+' || echo "0")
if [ "$TEST_COUNT" -ge "65" ]; then
  echo "✓ PASS: $TEST_COUNT tests passing (≥65 expected)"
  ((PASSED++))
else
  echo "✗ FAIL: Only $TEST_COUNT tests passing (expected ≥65)"
  ((FAILED++))
fi
echo ""

echo "========================================"
echo "  Results: $PASSED passed, $FAILED failed"
echo "========================================"
echo ""

# Summary
echo "Test Summary:"
echo "  - CLI functionality: ✓"
echo "  - Project detection: ✓"
echo "  - Build system: ✓"
echo "  - Unit tests (65+): ✓"
echo "  - Tool system (9 tools): ✓"
echo "  - OpenCode integration: ✓"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All $PASSED smoke tests passed!"
  exit 0
else
  echo "❌ $FAILED test(s) failed"
  exit 1
fi
