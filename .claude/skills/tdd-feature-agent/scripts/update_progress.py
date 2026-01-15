#!/usr/bin/env python3
"""
Update progress.txt after completing a feature.
Appends completion info and context for the next agent.
"""

import json
import sys
import re
from datetime import datetime
from pathlib import Path


def update_progress(progress_path: str, feature_id: str, feature_name: str, 
                    tests_passed: int, context_notes: list[str], files_modified: list[str]):
    """Update progress.txt with feature completion info."""
    
    try:
        content = Path(progress_path).read_text()
    except FileNotFoundError:
        print(f"❌ File not found: {progress_path}")
        return False
    
    # Update timestamp
    content = re.sub(
        r'Last Updated:.*',
        f'Last Updated: {datetime.now().isoformat()}',
        content
    )
    
    # Add to completed features
    completion_line = f"- [x] {feature_id}: {feature_name} ({tests_passed} tests passed)"
    
    if "## Completed Features" in content:
        # Insert after the header
        if "(none yet)" in content:
            content = content.replace("(none yet)", completion_line)
        else:
            content = re.sub(
                r'(## Completed Features\n)',
                f'\\1{completion_line}\n',
                content
            )
    
    # Update context section
    if context_notes:
        context_text = "\n".join(f"- {note}" for note in context_notes)
        if "## Context for Next Agent" in content:
            # Replace or append to existing context
            content = re.sub(
                r'## Context for Next Agent\n.*?(?=\n## |\Z)',
                f'## Context for Next Agent\n{context_text}\n\n',
                content,
                flags=re.DOTALL
            )
    
    # Update file summary
    if files_modified:
        file_lines = "\n".join(f"- {f}" for f in files_modified)
        if "## File Summary" in content:
            # Append to existing file summary
            content = re.sub(
                r'(## File Summary\n)',
                f'\\1{file_lines}\n',
                content
            )
    
    # Clear any "Last Error" section on success
    content = re.sub(
        r'## Last Error\n.*?(?=\n## |\Z)',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Write back
    Path(progress_path).write_text(content)
    print(f"✅ Updated {progress_path}")
    
    return True


def add_error(progress_path: str, feature_id: str, error_message: str, attempt: int):
    """Add error information to progress.txt for retry context."""
    
    try:
        content = Path(progress_path).read_text()
    except FileNotFoundError:
        print(f"❌ File not found: {progress_path}")
        return False
    
    # Update timestamp
    content = re.sub(
        r'Last Updated:.*',
        f'Last Updated: {datetime.now().isoformat()}',
        content
    )
    
    # Add or update error section
    error_section = f"""## Last Error
Feature: {feature_id}
Attempt: {attempt}
Time: {datetime.now().isoformat()}
Error:
```
{error_message}
```

"""
    
    if "## Last Error" in content:
        content = re.sub(
            r'## Last Error\n.*?(?=\n## |\Z)',
            error_section,
            content,
            flags=re.DOTALL
        )
    else:
        # Add before "## Known Issues" or at end
        if "## Known Issues" in content:
            content = content.replace("## Known Issues", f"{error_section}## Known Issues")
        else:
            content += f"\n{error_section}"
    
    Path(progress_path).write_text(content)
    print(f"⚠️ Added error context to {progress_path}")
    
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Complete: update_progress.py complete <feature_id> <feature_name> <tests_passed> [context_notes...] -- [files_modified...]")
        print("  Error:    update_progress.py error <feature_id> <attempt_number> <error_message>")
        print()
        print("Examples:")
        print('  update_progress.py complete F001 "User Auth" 3 "Using JWT tokens" "Auth in src/auth.py" -- src/auth.py src/models.py')
        print('  update_progress.py error F002 1 "ImportError: No module named bcrypt"')
        sys.exit(1)
    
    # Find progress.txt
    progress_path = Path("progress.txt")
    if not progress_path.exists():
        progress_path = Path("../progress.txt")
    if not progress_path.exists():
        print("❌ Could not find progress.txt")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "complete":
        if len(sys.argv) < 5:
            print("❌ complete requires: feature_id, feature_name, tests_passed")
            sys.exit(1)
        
        feature_id = sys.argv[2]
        feature_name = sys.argv[3]
        tests_passed = int(sys.argv[4])
        
        # Parse context notes and files (split by --)
        remaining = sys.argv[5:]
        if "--" in remaining:
            split_idx = remaining.index("--")
            context_notes = remaining[:split_idx]
            files_modified = remaining[split_idx + 1:]
        else:
            context_notes = remaining
            files_modified = []
        
        success = update_progress(
            str(progress_path), feature_id, feature_name, 
            tests_passed, context_notes, files_modified
        )
        sys.exit(0 if success else 1)
    
    elif command == "error":
        if len(sys.argv) < 5:
            print("❌ error requires: feature_id, attempt_number, error_message")
            sys.exit(1)
        
        feature_id = sys.argv[2]
        attempt = int(sys.argv[3])
        error_message = sys.argv[4]
        
        success = add_error(str(progress_path), feature_id, error_message, attempt)
        sys.exit(0 if success else 1)
    
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
