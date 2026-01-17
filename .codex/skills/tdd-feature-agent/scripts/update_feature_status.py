#!/usr/bin/env python3
"""
Update feature status in features.json after implementation.
"""

import json
import sys
from datetime import datetime
from pathlib import Path


def update_feature_status(features_path: str, feature_id: str, status: str, notes: str = None):
    """Update a feature's status and optionally add implementation notes."""
    
    valid_statuses = ["pending", "in_progress", "complete", "failed"]
    if status not in valid_statuses:
        print(f"❌ Invalid status '{status}'. Must be one of: {valid_statuses}")
        return False
    
    try:
        with open(features_path) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ File not found: {features_path}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return False
    
    # Find and update feature
    feature_found = False
    for feature in data["features"]:
        if feature["id"] == feature_id:
            old_status = feature.get("status", "unknown")
            feature["status"] = status
            
            if notes:
                feature["implementation_notes"] = notes
            
            if status == "complete":
                # Mark all test cases as passed
                for tc in feature.get("test_cases", []):
                    tc["status"] = "passed"
            
            feature_found = True
            print(f"✅ Updated {feature_id}: {old_status} → {status}")
            break
    
    if not feature_found:
        print(f"❌ Feature '{feature_id}' not found")
        return False
    
    # Update timestamp
    data["updated_at"] = datetime.now().isoformat()
    
    # Write back
    with open(features_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    # Print progress summary
    total = len(data["features"])
    complete = sum(1 for f in data["features"] if f["status"] == "complete")
    print(f"\n📊 Progress: {complete}/{total} features complete ({100*complete//total}%)")
    
    return True


def main():
    if len(sys.argv) < 3:
        print("Usage: update_feature_status.py <feature_id> <status> [notes]")
        print("       update_feature_status.py F001 complete 'Implemented user auth'")
        print("\nStatuses: pending, in_progress, complete, failed")
        sys.exit(1)
    
    feature_id = sys.argv[1]
    status = sys.argv[2]
    notes = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Look for features.json in current dir or parent
    features_path = Path("features.json")
    if not features_path.exists():
        features_path = Path("../features.json")
    if not features_path.exists():
        print("❌ Could not find features.json")
        sys.exit(1)
    
    success = update_feature_status(str(features_path), feature_id, status, notes)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
