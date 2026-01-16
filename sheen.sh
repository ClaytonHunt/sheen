#!/bin/bash

################################################################################
# Sheen - Autonomous Development Agent
# 
# This script runs OpenCode in a continuous loop, implementing features
# through Discovery → Planning → Implementation → Validation phases.
#
# Features:
# - Automatic error recovery
# - Phase timeout protection
# - Progress tracking and metrics
# - Test failure handling with retries
# - Generic support for any project with planning documents
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE=".sheenconfig"
LOG_DIR="logs/sheen"
ITERATION=0
MAX_ITERATIONS=100
CURRENT_PHASE="DISCOVERY"
SLEEP_BETWEEN_ITERATIONS=5
VERBOSE=false

# Phase timeout limits (iterations)
MAX_DISCOVERY_ITERATIONS=5
MAX_PLANNING_ITERATIONS=10
MAX_IMPLEMENTATION_ITERATIONS=70
MAX_VALIDATION_ITERATIONS=10

# Error recovery settings
MAX_OPENCODE_ERRORS=3
MAX_TEST_RETRIES=3
OPENCODE_ERROR_COUNT=0
TEST_FAILURE_COUNT=0

# Progress tracking
PHASE_ITERATION_COUNT=0
LAST_TEST_COUNT=0
LAST_FILE_COUNT=0
LAST_COMMIT_HASH=""
NO_PROGRESS_COUNT=0
MAX_NO_PROGRESS=5

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Sheen - Autonomous Development Agent"
            echo ""
            echo "Options:"
            echo "  -v, --verbose    Show detailed output (OpenCode operations in real-time)"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Configuration:"
            echo "  Edit .sheenconfig to change settings"
            echo ""
            echo "Phase Timeout Limits:"
            echo "  Discovery:        $MAX_DISCOVERY_ITERATIONS iterations"
            echo "  Planning:         $MAX_PLANNING_ITERATIONS iterations"
            echo "  Implementation:   $MAX_IMPLEMENTATION_ITERATIONS iterations"
            echo "  Validation:       $MAX_VALIDATION_ITERATIONS iterations"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Load configuration
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

################################################################################
# Functions
################################################################################

print_banner() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║   ███████╗██╗  ██╗███████╗███████╗███╗   ██╗                     ║"
    echo "║   ██╔════╝██║  ██║██╔════╝██╔════╝████╗  ██║                     ║"
    echo "║   ███████╗███████║█████╗  █████╗  ██╔██╗ ██║                     ║"
    echo "║   ╚════██║██╔══██║██╔══╝  ██╔══╝  ██║╚██╗██║                     ║"
    echo "║   ███████║██║  ██║███████╗███████╗██║ ╚████║                     ║"
    echo "║   ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝                     ║"
    echo "║                                                                   ║"
    echo "║             Autonomous Development Agent                         ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${CYAN}[INFO]${NC} $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        PHASE)
            echo -e "${PURPLE}[PHASE]${NC} $message"
            ;;
        METRIC)
            echo -e "${BLUE}[METRIC]${NC} $message"
            ;;
    esac
    
    # Log to file
    mkdir -p "$LOG_DIR"
    echo "[$timestamp] [$level] $message" >> "$LOG_DIR/sheen.log"
}

check_prerequisites() {
    log INFO "Checking prerequisites..."
    
    # Check if opencode is installed
    if ! command -v opencode &> /dev/null; then
        log ERROR "OpenCode is not installed. Please install it first."
        echo "  Visit: https://opencode.ai/docs"
        exit 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir &> /dev/null; then
        log ERROR "Not in a git repository. Please initialize git first."
        echo "  Run: git init"
        exit 1
    fi
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        log ERROR "Git is not installed."
        exit 1
    fi
    
    # Configure git to handle line endings automatically and silently
    git config core.autocrlf true 2>/dev/null || true
    git config core.safecrlf false 2>/dev/null || true
    
    log SUCCESS "All prerequisites met"
}

update_prompt_phase() {
    local phase=$1
    
    # Update the "Current Iteration" section at the bottom of PROMPT.md if it exists
    if [ -f "PROMPT.md" ]; then
        sed -i.bak \
            -e "s/\*\*Phase:\*\* .*/\*\*Phase:\*\* $phase/" \
            -e "s/\*\*Next Action:\*\* .*/\*\*Next Action:\*\* $phase/" \
            PROMPT.md
    fi
}

check_phase_timeout() {
    local phase=$1
    local iterations=$2
    local max_iterations=0
    
    case $phase in
        DISCOVERY)
            max_iterations=$MAX_DISCOVERY_ITERATIONS
            ;;
        PLANNING)
            max_iterations=$MAX_PLANNING_ITERATIONS
            ;;
        IMPLEMENTATION)
            max_iterations=$MAX_IMPLEMENTATION_ITERATIONS
            ;;
        VALIDATION)
            max_iterations=$MAX_VALIDATION_ITERATIONS
            ;;
    esac
    
    if [ $iterations -ge $max_iterations ]; then
        log ERROR "Phase timeout: $phase exceeded $max_iterations iterations"
        log ERROR "This usually indicates OpenCode is stuck or not making progress"
        log INFO "Possible issues:"
        log INFO "  - Phase completion marker not being written correctly"
        log INFO "  - OpenCode hitting errors repeatedly"
        log INFO "  - Task too complex for current approach"
        echo ""
        read -p "Do you want to force move to next phase? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            return 1  # Force phase change
        else
            log INFO "Sheen stopping. Please review logs and fix issues."
            exit 1
        fi
    fi
    
    return 0
}

track_progress() {
    local phase=$1
    
    # Get current metrics (strip whitespace and ensure integer)
    local current_test_count=$(dotnet test --no-build --list-tests 2>/dev/null | grep -c "    " 2>/dev/null || echo "0")
    current_test_count=$(echo "$current_test_count" | tr -d '[:space:]' | sed 's/^$/0/')
    current_test_count=$((10#${current_test_count:-0}))  # Force base-10, strip leading zeros
    
    local current_file_count=$(find src -type f -name "*.cs" 2>/dev/null | wc -l 2>/dev/null || echo "0")
    current_file_count=$(echo "$current_file_count" | tr -d '[:space:]' | sed 's/^$/0/')
    current_file_count=$((10#${current_file_count:-0}))  # Force base-10, strip leading zeros
    
    local current_commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Ensure LAST_* variables are integers
    LAST_TEST_COUNT=$((10#${LAST_TEST_COUNT:-0}))
    LAST_FILE_COUNT=$((10#${LAST_FILE_COUNT:-0}))
    LAST_COMMIT_HASH=${LAST_COMMIT_HASH:-unknown}
    
    if [ "$VERBOSE" = true ]; then
        log METRIC "Progress: Tests=$current_test_count Files=$current_file_count Commit=$current_commit_hash"
    fi
    
    # Check if progress is being made
    if [ "$phase" = "IMPLEMENTATION" ]; then
        if [ $current_test_count -eq $LAST_TEST_COUNT ] && \
           [ $current_file_count -eq $LAST_FILE_COUNT ] && \
           [ "$current_commit_hash" = "$LAST_COMMIT_HASH" ]; then
            NO_PROGRESS_COUNT=$((NO_PROGRESS_COUNT + 1))
            
            if [ $NO_PROGRESS_COUNT -ge $MAX_NO_PROGRESS ]; then
                log WARNING "No progress detected for $MAX_NO_PROGRESS iterations!"
                log WARNING "Tests: $current_test_count, Files: $current_file_count"
                log INFO "OpenCode may be stuck. Consider manual intervention."
            fi
        else
            NO_PROGRESS_COUNT=0  # Reset counter on progress
            
            # Log progress changes
            if [ $current_test_count -gt $LAST_TEST_COUNT ]; then
                local new_tests=$((current_test_count - LAST_TEST_COUNT))
                log SUCCESS "Progress: +$new_tests tests added"
            fi
            
            if [ $current_file_count -gt $LAST_FILE_COUNT ]; then
                local new_files=$((current_file_count - LAST_FILE_COUNT))
                log SUCCESS "Progress: +$new_files files added"
            fi
        fi
    fi
    
    # Update last known values
    LAST_TEST_COUNT=$current_test_count
    LAST_FILE_COUNT=$current_file_count
    LAST_COMMIT_HASH=$current_commit_hash
}

detect_opencode_errors() {
    local log_file=$1
    
    # Check for common error patterns
    if grep -qi "error\|exception\|failed\|fatal" "$log_file" 2>/dev/null; then
        # Exclude test failure messages (those are handled separately)
        if ! grep -qi "test.*passed\|test.*failed" "$log_file"; then
            OPENCODE_ERROR_COUNT=$((OPENCODE_ERROR_COUNT + 1))
            log WARNING "OpenCode error detected (count: $OPENCODE_ERROR_COUNT/$MAX_OPENCODE_ERRORS)"
            
            if [ $OPENCODE_ERROR_COUNT -ge $MAX_OPENCODE_ERRORS ]; then
                log ERROR "Too many OpenCode errors. Stopping for manual review."
                log INFO "Check log: $log_file"
                exit 1
            fi
            
            return 1
        fi
    fi
    
    # Reset error count on successful run
    OPENCODE_ERROR_COUNT=0
    return 0
}

detect_phase_completion() {
    local phase="$1"
    
    if [ "$VERBOSE" = true ]; then
        log INFO "🔍 Checking phase completion for: $phase" >&2
    fi
    
    # Check if phase completion marker exists in the corresponding file
    # Look in common locations: root directory, docs/, .sheen/
    case $phase in
        DISCOVERY)
            if [ "$VERBOSE" = true ]; then
                [ -f "DISCOVERY.md" ] && log INFO "  ✓ Found ./DISCOVERY.md" >&2 || log INFO "  ✗ No ./DISCOVERY.md" >&2
                [ -f "docs/DISCOVERY.md" ] && log INFO "  ✓ Found docs/DISCOVERY.md" >&2
                [ -f ".sheen/DISCOVERY.md" ] && log INFO "  ✓ Found .sheen/DISCOVERY.md" >&2
            fi
            
            # Check multiple possible locations for DISCOVERY.md
            if ([ -f "DISCOVERY.md" ] && grep -q "DISCOVERY COMPLETE" DISCOVERY.md) || \
               ([ -f "docs/DISCOVERY.md" ] && grep -q "DISCOVERY COMPLETE" "docs/DISCOVERY.md") || \
               ([ -f ".sheen/DISCOVERY.md" ] && grep -q "DISCOVERY COMPLETE" ".sheen/DISCOVERY.md"); then
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✓ Found 'DISCOVERY COMPLETE' marker" >&2
                fi
                echo "PLANNING"
            else
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✗ No completion marker found" >&2
                fi
                echo "CONTINUE"
            fi
            ;;
        PLANNING)
            if [ "$VERBOSE" = true ]; then
                [ -f "PLAN.md" ] && log INFO "  ✓ Found ./PLAN.md" >&2 || log INFO "  ✗ No ./PLAN.md" >&2
                [ -f "docs/PLAN.md" ] && log INFO "  ✓ Found docs/PLAN.md" >&2
                [ -f ".sheen/plan.md" ] && log INFO "  ✓ Found .sheen/plan.md" >&2
            fi
            
            # Check multiple possible locations for PLAN.md (note: .sheen uses lowercase plan.md)
            if ([ -f "PLAN.md" ] && grep -q "PLAN COMPLETE" PLAN.md) || \
               ([ -f "docs/PLAN.md" ] && grep -q "PLAN COMPLETE" "docs/PLAN.md") || \
               ([ -f ".sheen/plan.md" ] && grep -q "PLAN COMPLETE" ".sheen/plan.md") || \
               ([ -f ".sheen/PLAN.md" ] && grep -q "PLAN COMPLETE" ".sheen/PLAN.md"); then
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✓ Found 'PLAN COMPLETE' marker" >&2
                fi
                echo "IMPLEMENTATION"
            else
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✗ No completion marker found" >&2
                fi
                echo "CONTINUE"
            fi
            ;;
        IMPLEMENTATION)
            if [ "$VERBOSE" = true ]; then
                [ -f "PROJECT_STATUS.md" ] && log INFO "  ✓ Found PROJECT_STATUS.md" >&2 || log INFO "  ✗ No PROJECT_STATUS.md" >&2
            fi
            
            # Check for implementation completion marker in PROJECT_STATUS.md or similar files
            if ([ -f "PROJECT_STATUS.md" ] && grep -q "IMPLEMENTATION COMPLETE" PROJECT_STATUS.md) || \
               ([ -f "STATUS.md" ] && grep -q "IMPLEMENTATION COMPLETE" STATUS.md) || \
               ([ -f ".sheen/status.md" ] && grep -q "IMPLEMENTATION COMPLETE" ".sheen/status.md"); then
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✓ Found 'IMPLEMENTATION COMPLETE' marker" >&2
                fi
                echo "VALIDATION"
            else
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✗ No completion marker found" >&2
                fi
                echo "CONTINUE"
            fi
            ;;
        VALIDATION)
            if [ "$VERBOSE" = true ]; then
                [ -f "VALIDATION.md" ] && log INFO "  ✓ Found ./VALIDATION.md" >&2 || log INFO "  ✗ No ./VALIDATION.md" >&2
                [ -f "docs/VALIDATION.md" ] && log INFO "  ✓ Found docs/VALIDATION.md" >&2
                [ -f ".sheen/VALIDATION.md" ] && log INFO "  ✓ Found .sheen/VALIDATION.md" >&2
            fi
            
            # Check multiple possible locations for VALIDATION.md
            if ([ -f "VALIDATION.md" ] && grep -q "VALIDATION COMPLETE" VALIDATION.md) || \
               ([ -f "docs/VALIDATION.md" ] && grep -q "VALIDATION COMPLETE" "docs/VALIDATION.md") || \
               ([ -f ".sheen/VALIDATION.md" ] && grep -q "VALIDATION COMPLETE" ".sheen/VALIDATION.md"); then
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✓ Found 'VALIDATION COMPLETE' marker" >&2
                fi
                echo "COMPLETE"
            else
                if [ "$VERBOSE" = true ]; then
                    log INFO "  ✗ No completion marker found" >&2
                fi
                echo "CONTINUE"
            fi
            ;;
        *)
            echo "CONTINUE"
            ;;
    esac
}

run_opencode() {
    local iteration=$1
    local phase=$2
    
    log PHASE "Running OpenCode - Iteration #$iteration - Phase: $phase" >&2
    
    # Create log file for this iteration
    local log_file="$LOG_DIR/iteration-${iteration}-${phase}.log"
    
    # Update prompt with current phase
    update_prompt_phase "$phase"
    
    # Get commit count before OpenCode runs (for tracking)
    local commits_before=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    
    # Prepare the prompt based on phase
    local prompt_text
    case $phase in
        DISCOVERY)
            prompt_text="Begin Discovery Phase: Review project documentation and planning files (check for .sheen/plan.md, docs/, or other planning documents). Analyze the requirements and create DISCOVERY.md documenting your findings, architecture decisions, and technical approach. End with 'DISCOVERY COMPLETE - Ready for Planning'"
            ;;
        PLANNING)
            prompt_text="Begin Planning Phase: Based on DISCOVERY.md and project documentation, create PLAN.md with detailed implementation plan including: architecture/design decisions, API contracts (if applicable), module structure, test strategy, and implementation steps. End with 'PLAN COMPLETE - Ready for Implementation'"
            ;;
        IMPLEMENTATION)
            prompt_text="Continue Implementation Phase: Follow PLAN.md and implement features using best practices for this project type. Use TDD when appropriate (write tests first, implement minimal code, refactor). CRITICAL: Commit frequently after completing logical units of work with 'git add -A && git commit -m \"descriptive message\"'. When all planned features are implemented and working, update PROJECT_STATUS.md and end with 'IMPLEMENTATION COMPLETE - All features working'"
            ;;
        VALIDATION)
            prompt_text="Begin Validation Phase: Validate the implementation against original requirements and acceptance criteria from planning documents. Run all tests and checks appropriate for this project. Create VALIDATION.md documenting test results, coverage, and validation status. End with 'VALIDATION COMPLETE - Ready for review'"
            ;;
        *)
            prompt_text="Continue with current phase: $phase"
            ;;
    esac
    
    # Run OpenCode with the prompt
    log INFO "Prompt: $prompt_text" >&2
    
    # Run OpenCode (with error handling)
    # IMPORTANT: Use --continue to maintain context across iterations
    local opencode_exit_code=0
    if [ "$VERBOSE" = true ]; then
        # Verbose mode: Show OpenCode output in real-time
        log INFO "Running OpenCode in VERBOSE mode (live output)..." >&2
        echo "" >&2
        opencode run --continue "$prompt_text" 2>&1 | tee "$log_file" >&2 || opencode_exit_code=$?
        echo "" >&2
    else
        # Normal mode: Run quietly and show summary
        opencode run --continue "$prompt_text" > "$log_file" 2>&1 || opencode_exit_code=$?
        
        # Show a summary of what happened
        local line_count=$(wc -l < "$log_file")
        log INFO "OpenCode completed ($line_count lines of output - see $log_file for details)" >&2
        
        # Show last few lines as a preview
        echo "" >&2
        log INFO "Last 5 lines of output:" >&2
        tail -5 "$log_file" >&2
        echo "" >&2
    fi
    
    # Check for errors in OpenCode execution
    if [ $opencode_exit_code -ne 0 ]; then
        log WARNING "OpenCode exited with code $opencode_exit_code" >&2
        detect_opencode_errors "$log_file"
    else
        detect_opencode_errors "$log_file"
    fi
    
    # Check if OpenCode made any commits (during implementation)
    local commits_after=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    local new_commits=$((commits_after - commits_before))
    
    if [ $new_commits -gt 0 ]; then
        log SUCCESS "OpenCode created $new_commits commit(s)" >&2
        
        # Show recent commits
        if [ "$VERBOSE" = true ]; then
            log INFO "Recent commits:" >&2
            git log --oneline -n $new_commits >&2
        fi
    elif [ "$phase" = "IMPLEMENTATION" ]; then
        log WARNING "No commits created during implementation iteration (OpenCode may not be following TDD properly)" >&2
    fi
    
    # Wait a moment for files to be written
    sleep 2
    
    # Detect if phase is complete by checking files
    local next_phase=$(detect_phase_completion "$phase")
    
    # Return ONLY the next phase name on stdout (nothing else!)
    echo "$next_phase"
}

run_tests_with_retry() {
    local attempt=1
    local max_attempts=$MAX_TEST_RETRIES
    
    log INFO "Running backend tests (attempt $attempt/$max_attempts)..."
    
    while [ $attempt -le $max_attempts ]; do
        if dotnet test --no-build --verbosity quiet > "$LOG_DIR/test-results.log" 2>&1; then
            local test_count=$(grep -oP '\d+(?= passed)' "$LOG_DIR/test-results.log" | head -1)
            log SUCCESS "Tests passed ($test_count tests)"
            TEST_FAILURE_COUNT=0  # Reset failure count
            return 0
        else
            log WARNING "Tests failed (attempt $attempt/$max_attempts)"
            TEST_FAILURE_COUNT=$((TEST_FAILURE_COUNT + 1))
            
            if [ $attempt -lt $max_attempts ]; then
                log INFO "Retrying in 5 seconds..."
                sleep 5
                attempt=$((attempt + 1))
            else
                log ERROR "Tests failed after $max_attempts attempts"
                log INFO "Check test output: $LOG_DIR/test-results.log"
                
                # Show test failures
                echo ""
                log ERROR "Test failures:"
                grep -A 5 "Failed!" "$LOG_DIR/test-results.log" || cat "$LOG_DIR/test-results.log"
                echo ""
                
                return 1
            fi
        fi
    done
    
    return 1
}

check_git_status() {
    log INFO "Checking git status..."
    
    if [ -n "$(git status --porcelain)" ]; then
        log INFO "Uncommitted changes detected"
        git status --short
        return 1
    else
        log SUCCESS "Working directory clean"
        return 0
    fi
}

auto_commit_changes() {
    local phase=$1
    local message=$2
    
    # Check if AUTO_COMMIT is enabled
    if [ "$AUTO_COMMIT" != "true" ]; then
        if [ "$VERBOSE" = true ]; then
            log INFO "Auto-commit disabled (set AUTO_COMMIT=true in .sheenconfig)" >&2
        fi
        return 0
    fi
    
    # Check if there are changes to commit
    if [ -z "$(git status --porcelain)" ]; then
        if [ "$VERBOSE" = true ]; then
            log INFO "No changes to commit" >&2
        fi
        return 0
    fi
    
    log INFO "Auto-committing changes for $phase..." >&2
    
    # Stage all changes (suppress CRLF warnings)
    git add -A 2>&1 | grep -v "CRLF" | grep -v "LF" | grep -v "line ending" || true
    
    # Create commit (suppress CRLF warnings)
    if git commit -m "$message" 2>&1 | grep -v "CRLF" | grep -v "LF" | grep -v "line ending" > /dev/null; then
        local commit_hash=$(git rev-parse --short HEAD)
        log SUCCESS "Committed: $commit_hash - $message" >&2
        return 0
    else
        log WARNING "Commit failed" >&2
        return 1
    fi
}

main_loop() {
    local phase="DISCOVERY"
    
    while [ $ITERATION -lt $MAX_ITERATIONS ]; do
        ITERATION=$((ITERATION + 1))
        PHASE_ITERATION_COUNT=$((PHASE_ITERATION_COUNT + 1))
        
        echo ""
        log INFO "═══════════════════════════════════════════════════════════"
        log INFO "Iteration #$ITERATION - Phase: $phase ($PHASE_ITERATION_COUNT in phase)"
        log INFO "═══════════════════════════════════════════════════════════"
        echo ""
        
        # Check phase timeout
        check_phase_timeout "$phase" "$PHASE_ITERATION_COUNT" || {
            log WARNING "Forcing phase transition due to timeout"
            # Force phase transition logic here
        }
        
        # Track progress metrics
        track_progress "$phase"
        
        # Run OpenCode
        local next_phase=$(run_opencode "$ITERATION" "$phase")
        
        # Log what was detected
        log INFO "Phase detection result: $next_phase (was in $phase)"
        
        # Check what to do next
        case $next_phase in
            PLANNING)
                log SUCCESS "Discovery phase complete. Moving to Planning."
                
                # Commit discovery work
                auto_commit_changes "Discovery" "docs: complete discovery phase"
                
                phase="PLANNING"
                PHASE_ITERATION_COUNT=0  # Reset phase counter
                log INFO "Phase is now: $phase"
                ;;
            IMPLEMENTATION)
                log SUCCESS "Planning phase complete. Moving to Implementation."
                
                # Commit planning work
                auto_commit_changes "Planning" "docs: complete planning phase"
                
                phase="IMPLEMENTATION"
                PHASE_ITERATION_COUNT=0  # Reset phase counter
                log INFO "Phase is now: $phase"
                ;;
            VALIDATION)
                log SUCCESS "Implementation phase complete. Running tests..."
                
                # Commit implementation work before running tests
                auto_commit_changes "Implementation" "feat: complete implementation phase"
                
                # Run tests with retry logic
                if run_tests_with_retry; then
                    log SUCCESS "All tests passed. Moving to Validation."
                    phase="VALIDATION"
                    PHASE_ITERATION_COUNT=0  # Reset phase counter
                    log INFO "Phase is now: $phase"
                else
                    log WARNING "Tests failed. Asking OpenCode to fix issues..."
                    
                    if [ $TEST_FAILURE_COUNT -ge $MAX_TEST_RETRIES ]; then
                        log ERROR "Too many test failures. Manual intervention needed."
                        echo ""
                        read -p "Do you want to continue trying to fix? (y/n) " -n 1 -r
                        echo ""
                        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                            log INFO "Stopping for manual review."
                            exit 1
                        fi
                        TEST_FAILURE_COUNT=0  # Reset and continue
                    fi
                    
                    # Stay in implementation phase to fix issues
                    phase="IMPLEMENTATION"
                    log INFO "Phase remains: $phase (fixing test failures)"
                fi
                ;;
            COMPLETE)
                log SUCCESS "Validation complete!"
                
                # Commit validation work
                auto_commit_changes "Validation" "docs: complete validation phase"
                
                log INFO "Checking git status..."
                check_git_status
                
                log SUCCESS "════════════════════════════════════════════════════"
                log SUCCESS "DEVELOPMENT CYCLE COMPLETE"
                log SUCCESS "Total iterations: $ITERATION"
                log SUCCESS "════════════════════════════════════════════════════"
                
                # Ask if we should continue with next cycle
                echo ""
                read -p "Start another development cycle? (y/n) " -n 1 -r
                echo ""
                
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    log INFO "Starting new development cycle..."
                    phase="DISCOVERY"
                    PHASE_ITERATION_COUNT=0
                else
                    log INFO "Sheen stopping. Great work!"
                    break
                fi
                ;;
            CONTINUE)
                log INFO "Continuing in $phase phase..."
                
                # During implementation, commit progress periodically
                if [ "$phase" = "IMPLEMENTATION" ] && [ "$AUTO_COMMIT" = "true" ]; then
                    if [ -n "$(git status --porcelain)" ]; then
                        log INFO "Committing implementation progress..."
                        auto_commit_changes "Implementation" "wip: iteration #$ITERATION - ongoing implementation"
                    fi
                fi
                ;;
        esac
        
        # Sleep between iterations
        if [ $SLEEP_BETWEEN_ITERATIONS -gt 0 ]; then
            log INFO "Sleeping for ${SLEEP_BETWEEN_ITERATIONS}s before next iteration..."
            sleep $SLEEP_BETWEEN_ITERATIONS
        fi
    done
    
    if [ $ITERATION -ge $MAX_ITERATIONS ]; then
        log WARNING "Maximum iterations reached ($MAX_ITERATIONS)"
    fi
}

cleanup() {
    log INFO "Sheen shutting down..."
    
    # Show final metrics
    log INFO "Final Statistics:"
    log INFO "  Total iterations: $ITERATION"
    log INFO "  Current phase: $CURRENT_PHASE"
    log INFO "  Error count: $OPENCODE_ERROR_COUNT"
    log INFO "  Test failures: $TEST_FAILURE_COUNT"
    
    exit 0
}

################################################################################
# Main
################################################################################

# Trap Ctrl+C
trap cleanup INT

# Print banner
print_banner

# Check prerequisites
check_prerequisites

# Create log directory
mkdir -p "$LOG_DIR"

# Show configuration
log INFO "Starting autonomous development loop..."
log INFO "Configuration:"
log INFO "  Max iterations: $MAX_ITERATIONS"
log INFO "  Phase timeouts: Discovery=$MAX_DISCOVERY_ITERATIONS, Planning=$MAX_PLANNING_ITERATIONS"
log INFO "                  Implementation=$MAX_IMPLEMENTATION_ITERATIONS, Validation=$MAX_VALIDATION_ITERATIONS"
log INFO "  Error recovery: Max errors=$MAX_OPENCODE_ERRORS, Max test retries=$MAX_TEST_RETRIES"
log INFO "  Progress tracking: Enabled (checking every iteration)"
echo ""

if [ "$VERBOSE" = true ]; then
    log INFO "🔍 VERBOSE MODE ENABLED - You'll see OpenCode operations in real-time"
else
    log INFO "Running in normal mode (use -v or --verbose for live output)"
fi
log INFO "Press Ctrl+C to stop Sheen at any time"
echo ""

main_loop

log SUCCESS "Sheen finished successfully!"
