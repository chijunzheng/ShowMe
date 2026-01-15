#!/usr/bin/env python3
"""
Validate features.json structure and check for common issues.
Run after creating features.json to ensure it's well-formed.
"""

import json
import sys
from pathlib import Path


def validate_features(features_path: str) -> tuple[bool, list[str]]:
    """Validate features.json and return (is_valid, errors)."""
    errors = []
    warnings = []
    
    # Load file
    try:
        with open(features_path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"]
    except FileNotFoundError:
        return False, [f"File not found: {features_path}"]
    
    # Check required top-level fields
    if "project_name" not in data:
        errors.append("Missing required field: project_name")
    
    if "features" not in data:
        errors.append("Missing required field: features")
        return False, errors
    
    if not isinstance(data["features"], list):
        errors.append("'features' must be an array")
        return False, errors
    
    if len(data["features"]) == 0:
        errors.append("No features defined")
        return False, errors
    
    # Track IDs for uniqueness and dependency checking
    feature_ids = set()
    test_ids = set()
    
    for i, feature in enumerate(data["features"]):
        prefix = f"Feature {i+1}"
        
        # Check required feature fields
        required_fields = ["id", "name", "description", "test_cases"]
        for field in required_fields:
            if field not in feature:
                errors.append(f"{prefix}: Missing required field '{field}'")
        
        # Validate feature ID
        if "id" in feature:
            if feature["id"] in feature_ids:
                errors.append(f"{prefix}: Duplicate feature ID '{feature['id']}'")
            feature_ids.add(feature["id"])
        
        # Validate status
        valid_statuses = ["pending", "in_progress", "complete", "failed"]
        if feature.get("status") and feature["status"] not in valid_statuses:
            errors.append(f"{prefix}: Invalid status '{feature['status']}'")
        
        # Validate dependencies
        if "dependencies" in feature:
            if not isinstance(feature["dependencies"], list):
                errors.append(f"{prefix}: 'dependencies' must be an array")
            else:
                for dep in feature["dependencies"]:
                    if dep not in feature_ids and dep not in [f["id"] for f in data["features"]]:
                        # Check if dependency exists anywhere
                        all_ids = [f.get("id") for f in data["features"]]
                        if dep not in all_ids:
                            errors.append(f"{prefix}: Unknown dependency '{dep}'")
        
        # Validate test cases
        if "test_cases" in feature:
            if not isinstance(feature["test_cases"], list):
                errors.append(f"{prefix}: 'test_cases' must be an array")
            elif len(feature["test_cases"]) == 0:
                warnings.append(f"{prefix}: No test cases defined")
            elif len(feature["test_cases"]) > 10:
                warnings.append(f"{prefix}: Too many test cases ({len(feature['test_cases'])}), consider splitting feature")
            else:
                for j, test in enumerate(feature["test_cases"]):
                    test_prefix = f"{prefix}, Test {j+1}"
                    
                    required_test_fields = ["id", "description", "test_file"]
                    for field in required_test_fields:
                        if field not in test:
                            errors.append(f"{test_prefix}: Missing required field '{field}'")
                    
                    if "id" in test:
                        if test["id"] in test_ids:
                            errors.append(f"{test_prefix}: Duplicate test ID '{test['id']}'")
                        test_ids.add(test["id"])
    
    # Check for circular dependencies
    circular = check_circular_dependencies(data["features"])
    if circular:
        errors.append(f"Circular dependency detected: {' -> '.join(circular)}")
    
    # Print results
    is_valid = len(errors) == 0
    
    if warnings:
        print("⚠️  Warnings:")
        for w in warnings:
            print(f"   - {w}")
    
    return is_valid, errors


def check_circular_dependencies(features: list) -> list:
    """Check for circular dependencies using DFS. Returns cycle path if found."""
    feature_map = {f["id"]: f for f in features}
    visited = set()
    rec_stack = set()
    
    def dfs(node_id, path):
        if node_id in rec_stack:
            cycle_start = path.index(node_id)
            return path[cycle_start:] + [node_id]
        
        if node_id in visited:
            return None
        
        visited.add(node_id)
        rec_stack.add(node_id)
        
        feature = feature_map.get(node_id)
        if feature:
            for dep in feature.get("dependencies", []):
                result = dfs(dep, path + [node_id])
                if result:
                    return result
        
        rec_stack.remove(node_id)
        return None
    
    for feature in features:
        result = dfs(feature["id"], [])
        if result:
            return result
    
    return []


def main():
    if len(sys.argv) < 2:
        print("Usage: validate_features.py <path/to/features.json>")
        sys.exit(1)
    
    features_path = sys.argv[1]
    is_valid, errors = validate_features(features_path)
    
    if is_valid:
        print("✅ features.json is valid!")
        
        # Print summary
        with open(features_path) as f:
            data = json.load(f)
        
        total_features = len(data["features"])
        total_tests = sum(len(f.get("test_cases", [])) for f in data["features"])
        
        print(f"\n📊 Summary:")
        print(f"   - Project: {data.get('project_name', 'Unknown')}")
        print(f"   - Features: {total_features}")
        print(f"   - Total test cases: {total_tests}")
        
        sys.exit(0)
    else:
        print("❌ Validation failed:")
        for error in errors:
            print(f"   - {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
