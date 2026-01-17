#!/usr/bin/env python3
"""
TDD Orchestrator - Manages long-running autonomous coding with fresh context agents.

This script orchestrates the TDD workflow:
1. Initialize project from spec (calls initializer agent)
2. Loop through features (spawning fresh feature agents)
3. Track progress and handle failures
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


class TDDOrchestrator:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.features_file = self.project_path / "features.json"
        self.progress_file = self.project_path / "progress.txt"
        self.spec_file = self.project_path / "app_spec.md"
        self.tdd_dir = self.project_path / ".tdd"
        self.logs_dir = self.tdd_dir / "agent_logs"
        self.results_dir = self.tdd_dir / "test_results"
        self.config_file = self.tdd_dir / "config.json"
        
        self.config = self._load_config()
    
    def _load_config(self) -> dict:
        """Load configuration with defaults."""
        defaults = {
            "max_retries_per_feature": 3,
            "test_command": "pytest",
            "test_timeout_seconds": 300,
            "agent_model": "claude-sonnet-4-20250514",
            "parallel_features": False
        }
        
        if self.config_file.exists():
            with open(self.config_file) as f:
                user_config = json.load(f)
                defaults.update(user_config)
        
        return defaults
    
    def init_project(self, spec_path: str):
        """Initialize a new TDD project from a specification."""
        # Create directory structure
        self.project_path.mkdir(parents=True, exist_ok=True)
        self.tdd_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
        self.results_dir.mkdir(exist_ok=True)
        (self.project_path / "src").mkdir(exist_ok=True)
        (self.project_path / "tests").mkdir(exist_ok=True)
        
        # Copy spec file
        spec_content = Path(spec_path).read_text()
        self.spec_file.write_text(spec_content)
        
        # Save default config
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
        
        # Initialize progress file
        self._init_progress_file()
        
        print(f"✅ Project initialized at {self.project_path}")
        print(f"📋 Spec copied to {self.spec_file}")
        print("\n🚀 Next step: Run the initializer agent to generate features.json")
        print(f"   Use: tdd-initializer skill with spec at {self.spec_file}")
        
        return self._generate_initializer_prompt()
    
    def _init_progress_file(self):
        """Create initial progress.txt."""
        content = f"""=== TDD Progress Report ===
Project: {self.project_path.name}
Last Updated: {datetime.now().isoformat()}

## Completed Features
(none yet)

## Current Feature
Awaiting initialization...

## Context for Next Agent
Project just initialized. Run initializer agent to generate features.

## Known Issues
(none)

## File Summary
- app_spec.md: Original specification
"""
        self.progress_file.write_text(content)
    
    def _generate_initializer_prompt(self) -> str:
        """Generate the prompt for the initializer agent."""
        spec_content = self.spec_file.read_text()
        
        return f"""You are the TDD Initializer Agent. Your task is to analyze the app specification and create a features.json file with test cases.

## App Specification
{spec_content}

## Your Tasks
1. Break down the spec into discrete, testable features
2. For each feature, define 2-5 test cases that must pass
3. Create features.json at {self.features_file}
4. Scaffold the initial project structure with failing tests
5. Update progress.txt with initialization status

## Output Requirements
Create features.json with this schema:
{{
  "project_name": "string",
  "features": [
    {{
      "id": "F001",
      "name": "Feature name",
      "description": "What this feature does",
      "priority": 1,
      "dependencies": [],
      "status": "pending",
      "test_cases": [
        {{
          "id": "T001",
          "description": "Test description",
          "test_file": "tests/test_feature.py::test_name",
          "status": "pending"
        }}
      ]
    }}
  ]
}}

Order features by dependency (implement dependencies first).
"""
    
    def get_next_feature(self) -> Optional[dict]:
        """Get the next feature to implement."""
        if not self.features_file.exists():
            return None
        
        with open(self.features_file) as f:
            data = json.load(f)
        
        for feature in data["features"]:
            if feature["status"] == "pending":
                # Check dependencies are complete
                deps_complete = all(
                    self._is_feature_complete(dep_id, data["features"])
                    for dep_id in feature.get("dependencies", [])
                )
                if deps_complete:
                    return feature
        
        return None
    
    def _is_feature_complete(self, feature_id: str, features: list) -> bool:
        """Check if a feature is complete."""
        for f in features:
            if f["id"] == feature_id:
                return f["status"] == "complete"
        return False
    
    def generate_feature_prompt(self, feature: dict) -> str:
        """Generate the prompt for a feature agent."""
        progress_content = self.progress_file.read_text() if self.progress_file.exists() else ""
        
        return f"""You are a TDD Feature Agent. Implement the following feature and make all tests pass.

## Feature to Implement
ID: {feature['id']}
Name: {feature['name']}
Description: {feature['description']}

## Test Cases to Pass
{json.dumps(feature['test_cases'], indent=2)}

## Project Context (from previous agents)
{progress_content}

## Your Tasks
1. Read the existing codebase to understand the current state
2. Implement the feature to make all test cases pass
3. Run tests with: {self.config['test_command']}
4. If tests pass, update progress.txt with:
   - Mark this feature as complete
   - Add any context the next agent needs
   - Update the file summary
5. If tests fail, document what went wrong

## Working Directory
{self.project_path}

## Important
- Do NOT modify tests unless they have bugs
- Follow existing code patterns and conventions
- Keep implementations minimal - just enough to pass tests
"""
    
    def update_feature_status(self, feature_id: str, status: str, test_results: dict = None):
        """Update a feature's status in features.json."""
        with open(self.features_file) as f:
            data = json.load(f)
        
        for feature in data["features"]:
            if feature["id"] == feature_id:
                feature["status"] = status
                if test_results:
                    for tc in feature["test_cases"]:
                        if tc["id"] in test_results:
                            tc["status"] = test_results[tc["id"]]
                break
        
        with open(self.features_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def run_tests(self, feature: dict = None) -> tuple[bool, str]:
        """Run tests and return (success, output)."""
        cmd = self.config["test_command"].split()
        
        if feature:
            # Run only tests for this feature
            test_files = [tc["test_file"] for tc in feature["test_cases"]]
            cmd.extend(test_files)
        
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=self.config["test_timeout_seconds"]
            )
            success = result.returncode == 0
            output = result.stdout + result.stderr
            return success, output
        except subprocess.TimeoutExpired:
            return False, "Test execution timed out"
        except Exception as e:
            return False, f"Error running tests: {e}"
    
    def log_agent_run(self, feature_id: str, prompt: str, output: str, success: bool):
        """Log an agent run for debugging."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.logs_dir / f"{feature_id}_{timestamp}.log"
        
        content = f"""=== Agent Run Log ===
Feature: {feature_id}
Timestamp: {timestamp}
Success: {success}

=== Prompt ===
{prompt}

=== Output ===
{output}
"""
        log_file.write_text(content)
    
    def get_status(self) -> dict:
        """Get current project status."""
        if not self.features_file.exists():
            return {"status": "not_initialized", "features": []}
        
        with open(self.features_file) as f:
            data = json.load(f)
        
        total = len(data["features"])
        complete = sum(1 for f in data["features"] if f["status"] == "complete")
        failed = sum(1 for f in data["features"] if f["status"] == "failed")
        pending = total - complete - failed
        
        return {
            "status": "complete" if complete == total else "in_progress",
            "total_features": total,
            "complete": complete,
            "failed": failed,
            "pending": pending,
            "features": data["features"]
        }
    
    def resume(self) -> str:
        """Resume from where we left off - return prompt for next agent."""
        next_feature = self.get_next_feature()
        
        if next_feature is None:
            status = self.get_status()
            if status["status"] == "complete":
                return "🎉 All features complete! Running final test suite..."
            elif status["status"] == "not_initialized":
                return "❌ Project not initialized. Run init first."
            else:
                return f"⚠️ No actionable features. {status['failed']} failed, {status['pending']} blocked by dependencies."
        
        return self.generate_feature_prompt(next_feature)


def main():
    parser = argparse.ArgumentParser(description="TDD Orchestrator")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize new project")
    init_parser.add_argument("--spec", required=True, help="Path to spec file")
    init_parser.add_argument("--project", default="./tdd_project", help="Project directory")
    
    # Resume command
    resume_parser = subparsers.add_parser("resume", help="Resume existing project")
    resume_parser.add_argument("--project", required=True, help="Project directory")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Show project status")
    status_parser.add_argument("--project", required=True, help="Project directory")
    
    # Feature command (for single feature)
    feature_parser = subparsers.add_parser("feature", help="Generate prompt for specific feature")
    feature_parser.add_argument("--project", required=True, help="Project directory")
    feature_parser.add_argument("--feature", required=True, help="Feature ID")
    
    args = parser.parse_args()
    
    if args.command == "init":
        orchestrator = TDDOrchestrator(args.project)
        prompt = orchestrator.init_project(args.spec)
        print("\n" + "="*60)
        print("INITIALIZER AGENT PROMPT:")
        print("="*60)
        print(prompt)
    
    elif args.command == "resume":
        orchestrator = TDDOrchestrator(args.project)
        prompt = orchestrator.resume()
        print(prompt)
    
    elif args.command == "status":
        orchestrator = TDDOrchestrator(args.project)
        status = orchestrator.get_status()
        print(json.dumps(status, indent=2))
    
    elif args.command == "feature":
        orchestrator = TDDOrchestrator(args.project)
        with open(orchestrator.features_file) as f:
            data = json.load(f)
        
        feature = next((f for f in data["features"] if f["id"] == args.feature), None)
        if feature:
            print(orchestrator.generate_feature_prompt(feature))
        else:
            print(f"Feature {args.feature} not found")
            sys.exit(1)


if __name__ == "__main__":
    main()