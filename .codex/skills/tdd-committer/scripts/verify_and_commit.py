#!/usr/bin/env python3
"""
Full commit workflow: verify tests, stage files, commit, update progress.
"""

import argparse
import json
import subprocess
import sys
import re
from pathlib import Path
from datetime import datetime


def run_tests(test_command: str = "pytest", feature_tests: list[str] = None) -> tuple[bool, str, int, int]:
    """
    Run tests and return (success, output, passed_count, total_count).
    """
    cmd = test_command.split()
    
    # Add specific test files if provided
    if feature_tests:
        # Extract just the file paths (remove ::test_name suffixes)
        test_files = list(set(t.split("::")[0] for t in feature_tests))
        cmd.extend(test_files)
    
    cmd.extend(["-v", "--tb=short"])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stdout + result.stderr
    
    # Parse test counts from pytest output
    passed = 0
    total = 0
    
    # Look for "X passed" pattern
    passed_match = re.search(r'(\d+) passed', output)
    if passed_match:
        passed = int(passed_match.group(1))
    
    # Count total from individual test results
    total = len(re.findall(r'(PASSED|FAILED|ERROR)', output))
    
    success = result.returncode == 0
    return success, output, passed, total


def get_feature_info(features_path: str, feature_id: str) -> dict | None:
    """Get feature from features.json."""
    try:
        with open(features_path) as f:
            data = json.load(f)
        for feature in data["features"]:
            if feature["id"] == feature_id:
                return feature
        return None
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def update_feature_status(features_path: str, feature_id: str, status: str, commit_hash: str = None):
    """Update feature status in features.json."""
    with open(features_path) as f:
        data = json.load(f)
    
    for feature in data["features"]:
        if feature["id"] == feature_id:
            feature["status"] = status
            if commit_hash:
                feature["commit_hash"] = commit_hash
            # Mark all tests as passed
            for tc in feature.get("test_cases", []):
                tc["status"] = "passed"
            break
    
    data["updated_at"] = datetime.now().isoformat()
    
    with open(features_path, 'w') as f:
        json.dump(data, f, indent=2)


def update_progress_with_commit(progress_path: str, feature_id: str, feature_name: str, 
                                 tests_passed: int, commit_hash: str):
    """Add commit hash to progress.txt."""
    content = Path(progress_path).read_text()
    
    # Update timestamp
    content = re.sub(
        r'Last Updated:.*',
        f'Last Updated: {datetime.now().isoformat()}',
        content
    )
    
    # Add completed feature with commit hash
    completion_line = f"- [x] {feature_id}: {feature_name} ({tests_passed} tests) [{commit_hash}]"
    
    if "(none yet)" in content:
        content = content.replace("(none yet)", completion_line)
    elif "## Completed Features" in content:
        # Check if feature already listed (update it)
        pattern = rf'- \[x\] {feature_id}:.*'
        if re.search(pattern, content):
            content = re.sub(pattern, completion_line, content)
        else:
            content = re.sub(
                r'(## Completed Features\n)',
                f'\\1{completion_line}\n',
                content
            )
    
    Path(progress_path).write_text(content)


def stage_files(files: list[str]) -> int:
    """Stage specified files. Returns count of files staged."""
    staged = 0
    for f in files:
        if Path(f).exists():
            result = subprocess.run(["git", "add", f], capture_output=True)
            if result.returncode == 0:
                staged += 1
    return staged


def get_staged_files() -> list[str]:
    """Get list of currently staged files."""
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        capture_output=True, text=True
    )
    return [f for f in result.stdout.strip().split('\n') if f]


def get_commit_hash() -> str:
    """Get short hash of HEAD."""
    result = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True
    )
    return result.stdout.strip()


def generate_commit_message(feature: dict, passed: int, total: int) -> str:
    """Generate commit message for feature."""
    name = feature["name"]
    feature_id = feature["id"]
    
    # Truncate name if too long
    if len(name) > 40:
        name = name[:37] + "..."
    
    subject = f"feat: {name.lower()}"
    
    body = feature.get("description", "")
    if len(body) > 200:
        body = body[:197] + "..."
    
    footer = f"Implements: {feature_id}\nTests: {passed}/{total} passed"
    
    deps = feature.get("dependencies", [])
    if deps:
        footer += f"\nDepends-on: {', '.join(deps)}"
    
    return f"{subject}\n\n{body}\n\n{footer}"


def commit(message: str) -> tuple[bool, str]:
    """Execute git commit."""
    parts = message.split('\n\n')
    cmd = ["git", "commit"]
    for part in parts:
        if part.strip():
            cmd.extend(["-m", part])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0, result.stdout + result.stderr


def main():
    parser = argparse.ArgumentParser(description="Verify tests and commit feature")
    parser.add_argument("feature_id", help="Feature ID (e.g., F001)")
    parser.add_argument("--skip-tests", action="store_true", help="Skip test verification")
    parser.add_argument("--test-command", default="pytest", help="Test command to run")
    parser.add_argument("--features-file", default="features.json")
    parser.add_argument("--progress-file", default="progress.txt")
    parser.add_argument("--dry-run", action="store_true", help="Preview without committing")
    
    args = parser.parse_args()
    
    # Find files
    features_path = Path(args.features_file)
    progress_path = Path(args.progress_file)
    
    if not features_path.exists():
        features_path = Path("..") / args.features_file
    if not progress_path.exists():
        progress_path = Path("..") / args.progress_file
    
    if not features_path.exists():
        print(f"❌ Could not find {args.features_file}")
        sys.exit(1)
    
    # Get feature
    feature = get_feature_info(str(features_path), args.feature_id)
    if not feature:
        print(f"❌ Feature {args.feature_id} not found")
        sys.exit(1)
    
    print(f"🔍 Processing: {args.feature_id} - {feature['name']}")
    
    # Step 1: Verify tests
    if not args.skip_tests:
        print("\n📋 Running tests...")
        test_files = [tc["test_file"] for tc in feature.get("test_cases", [])]
        success, output, passed, total = run_tests(args.test_command, test_files)
        
        if not success:
            print(f"❌ Tests failed! ({passed}/{total} passed)")
            print("\n--- Test Output ---")
            print(output[-2000:] if len(output) > 2000 else output)  # Last 2000 chars
            print("-------------------")
            print("\n⚠️ Cannot commit with failing tests.")
            sys.exit(1)
        
        print(f"✅ Tests passed: {passed}/{total}")
    else:
        print("⚠️ Skipping test verification (--skip-tests)")
        passed, total = len(feature.get("test_cases", [])), len(feature.get("test_cases", []))
    
    # Step 2: Stage files
    print("\n📁 Staging files...")
    files_to_stage = feature.get("files_modified", [])
    
    # Also stage test files
    for tc in feature.get("test_cases", []):
        test_file = tc["test_file"].split("::")[0]
        if test_file not in files_to_stage:
            files_to_stage.append(test_file)
    
    staged_count = stage_files(files_to_stage)
    staged_files = get_staged_files()
    
    if not staged_files:
        print("⚠️ No files to commit. Feature may already be committed.")
        # Still update status
        if not args.dry_run:
            update_feature_status(str(features_path), args.feature_id, "complete")
        sys.exit(0)
    
    print(f"   Staged {len(staged_files)} files")
    for f in staged_files[:5]:
        print(f"   - {f}")
    if len(staged_files) > 5:
        print(f"   - ... and {len(staged_files) - 5} more")
    
    # Step 3: Generate commit message
    message = generate_commit_message(feature, passed, total)
    
    if args.dry_run:
        print("\n=== DRY RUN - Would commit: ===")
        print(message)
        print("=" * 40)
        sys.exit(0)
    
    # Step 4: Commit
    print("\n💾 Committing...")
    success, output = commit(message)
    
    if not success:
        print(f"❌ Commit failed: {output}")
        sys.exit(1)
    
    commit_hash = get_commit_hash()
    print(f"✅ Committed: {commit_hash}")
    
    # Step 5: Update tracking files
    print("\n📝 Updating progress...")
    update_feature_status(str(features_path), args.feature_id, "complete", commit_hash)
    
    if progress_path.exists():
        update_progress_with_commit(
            str(progress_path), 
            args.feature_id, 
            feature["name"],
            passed,
            commit_hash
        )
    
    print(f"\n🎉 Feature {args.feature_id} committed successfully!")
    print(f"   Commit: {commit_hash}")
    print(f"   Tests:  {passed}/{total} passed")
    

if __name__ == "__main__":
    main()
