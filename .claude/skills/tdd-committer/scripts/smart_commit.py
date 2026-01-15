#!/usr/bin/env python3
"""
Smart commit generator for TDD projects.
Generates meaningful commit messages from features.json metadata.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime


def get_feature_info(features_path: str, feature_id: str) -> dict | None:
    """Get feature details from features.json."""
    try:
        with open(features_path) as f:
            data = json.load(f)
        
        for feature in data["features"]:
            if feature["id"] == feature_id:
                return feature
        return None
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def get_changed_files() -> list[str]:
    """Get list of staged files."""
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return []
    return [f for f in result.stdout.strip().split('\n') if f]


def get_unstaged_files() -> list[str]:
    """Get list of modified but unstaged files."""
    result = subprocess.run(
        ["git", "diff", "--name-only"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return []
    return [f for f in result.stdout.strip().split('\n') if f]


def get_untracked_files() -> list[str]:
    """Get list of untracked files."""
    result = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return []
    return [f for f in result.stdout.strip().split('\n') if f]


def infer_scope(files: list[str]) -> str:
    """Infer commit scope from changed files."""
    if not files:
        return "general"
    
    # Common patterns
    scopes = set()
    for f in files:
        if 'auth' in f.lower():
            scopes.add('auth')
        elif 'user' in f.lower():
            scopes.add('user')
        elif 'api' in f.lower() or 'route' in f.lower():
            scopes.add('api')
        elif 'model' in f.lower() or 'db' in f.lower():
            scopes.add('db')
        elif 'test' in f.lower():
            scopes.add('test')
        elif 'config' in f.lower():
            scopes.add('config')
    
    if len(scopes) == 1:
        return scopes.pop()
    elif len(scopes) > 1:
        return 'core'
    else:
        # Infer from directory
        dirs = set(Path(f).parts[0] if '/' in f else 'root' for f in files)
        if 'src' in dirs:
            return 'core'
        return 'general'


def generate_commit_message(feature: dict, files: list[str], note: str = None) -> str:
    """Generate conventional commit message."""
    
    # Determine type
    commit_type = "feat"
    if feature.get("status") == "failed":
        commit_type = "fix"
    
    # Determine scope
    scope = infer_scope(files)
    
    # Subject line (max 50 chars)
    name = feature["name"]
    if len(name) > 40:
        name = name[:37] + "..."
    subject = f"{commit_type}({scope}): {name.lower()}"
    
    # Body
    body_lines = []
    
    # Add description if meaningful
    desc = feature.get("description", "")
    if desc and len(desc) < 200:
        body_lines.append(desc)
        body_lines.append("")
    
    # List key files changed
    if files:
        body_lines.append("Changes:")
        for f in files[:5]:  # Limit to 5 files
            body_lines.append(f"- {f}")
        if len(files) > 5:
            body_lines.append(f"- ... and {len(files) - 5} more files")
        body_lines.append("")
    
    # Add note if provided
    if note:
        body_lines.append(f"Note: {note}")
        body_lines.append("")
    
    # Footer
    test_count = len(feature.get("test_cases", []))
    passed_count = sum(1 for t in feature.get("test_cases", []) if t.get("status") == "passed")
    
    footer_lines = [
        f"Implements: {feature['id']}",
        f"Tests: {passed_count}/{test_count} passed"
    ]
    
    # Add dependencies if any
    deps = feature.get("dependencies", [])
    if deps:
        footer_lines.append(f"Depends-on: {', '.join(deps)}")
    
    # Combine all parts
    body = '\n'.join(body_lines) if body_lines else ""
    footer = '\n'.join(footer_lines)
    
    if body:
        return f"{subject}\n\n{body}\n{footer}"
    else:
        return f"{subject}\n\n{footer}"


def stage_feature_files(feature: dict, auto_stage: bool = False) -> list[str]:
    """Stage files related to the feature."""
    
    # Get files modified by this feature
    modified_files = feature.get("files_modified", [])
    
    # Get currently unstaged and untracked files
    unstaged = get_unstaged_files()
    untracked = get_untracked_files()
    
    files_to_stage = []
    
    # Stage known modified files
    for f in modified_files:
        if f in unstaged or f in untracked:
            files_to_stage.append(f)
    
    # If auto_stage, also stage related test files
    if auto_stage:
        for tc in feature.get("test_cases", []):
            test_file = tc.get("test_file", "").split("::")[0]  # Remove function name
            if test_file and (test_file in unstaged or test_file in untracked):
                files_to_stage.append(test_file)
    
    # Stage the files
    for f in files_to_stage:
        subprocess.run(["git", "add", f], check=True)
    
    return files_to_stage


def commit(message: str, dry_run: bool = False) -> bool:
    """Execute git commit."""
    if dry_run:
        print("=== DRY RUN - Would commit with message: ===")
        print(message)
        print("=" * 50)
        return True
    
    # Split message into parts for -m flags
    parts = message.split('\n\n')
    
    cmd = ["git", "commit"]
    for part in parts:
        cmd.extend(["-m", part])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Commit failed: {result.stderr}")
        return False
    
    print(f"✅ Committed successfully")
    print(result.stdout)
    return True


def get_commit_hash() -> str:
    """Get short hash of last commit."""
    result = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def main():
    parser = argparse.ArgumentParser(description="Smart commit for TDD features")
    parser.add_argument("feature_id", help="Feature ID (e.g., F001)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without committing")
    parser.add_argument("--note", help="Additional note to include in commit")
    parser.add_argument("--auto-stage", action="store_true", help="Auto-stage related files")
    parser.add_argument("--features-file", default="features.json", help="Path to features.json")
    
    args = parser.parse_args()
    
    # Find features.json
    features_path = Path(args.features_file)
    if not features_path.exists():
        features_path = Path("..") / args.features_file
    if not features_path.exists():
        print(f"❌ Could not find {args.features_file}")
        sys.exit(1)
    
    # Get feature info
    feature = get_feature_info(str(features_path), args.feature_id)
    if not feature:
        print(f"❌ Feature {args.feature_id} not found")
        sys.exit(1)
    
    # Auto-stage if requested
    if args.auto_stage:
        staged = stage_feature_files(feature, auto_stage=True)
        if staged:
            print(f"📁 Staged {len(staged)} files")
    
    # Get staged files
    files = get_changed_files()
    if not files and not args.dry_run:
        print("⚠️ No staged files. Stage files first or use --auto-stage")
        sys.exit(1)
    
    # Generate message
    message = generate_commit_message(feature, files, args.note)
    
    # Commit
    success = commit(message, args.dry_run)
    
    if success and not args.dry_run:
        commit_hash = get_commit_hash()
        print(f"\n📝 Commit: {commit_hash}")
        print(f"   Feature: {args.feature_id} - {feature['name']}")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
