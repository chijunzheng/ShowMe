#!/usr/bin/env python3
"""
TDD Auto-Runner: Self-spawning autonomous coding agent with multi-backend support.

Each feature gets a FRESH context window via a new agent query.
This script IS the orchestrator - it spawns child agents for each feature.

Supported Backends:
    - claude: Uses Claude Agent SDK (pip install claude-agent-sdk anyio)
    - gemini: Uses Gemini CLI via subprocess (requires gemini CLI installed)

Requirements:
    Claude backend: pip install claude-agent-sdk anyio
    Gemini backend: npm install -g @google/gemini-cli (or have it in PATH)
"""

from abc import ABC, abstractmethod
import asyncio
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, AsyncIterator
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# AGENT BACKEND ABSTRACTION
# =============================================================================

class BackendType(Enum):
    CLAUDE = "claude"
    GEMINI = "gemini"


@dataclass
class AgentEvent:
    """Unified event type for agent output."""
    type: str  # "text", "tool_use", "tool_result", "error", "complete"
    content: str
    metadata: Optional[dict] = None


class AgentBackend(ABC):
    """Abstract base class for agent backends."""

    @abstractmethod
    async def run_agent(
        self,
        system_prompt: str,
        user_prompt: str,
        cwd: str,
        agent_name: str = "agent"
    ) -> AsyncIterator[AgentEvent]:
        """Run an agent and yield events."""
        pass

    @abstractmethod
    def get_name(self) -> str:
        """Return the backend name."""
        pass


# =============================================================================
# CLAUDE BACKEND
# =============================================================================

class ClaudeBackend(AgentBackend):
    """Backend using Claude Agent SDK."""

    def __init__(self, model: str = "claude-sonnet-4-20250514"):
        self.model = model
        self._sdk_available = None

    def _check_sdk(self) -> bool:
        """Check if Claude SDK is available."""
        if self._sdk_available is None:
            try:
                from claude_agent_sdk import query  # noqa: F401
                self._sdk_available = True
            except ImportError:
                self._sdk_available = False
        return self._sdk_available

    def get_name(self) -> str:
        return "Claude Agent SDK"

    async def run_agent(
        self,
        system_prompt: str,
        user_prompt: str,
        cwd: str,
        agent_name: str = "agent"
    ) -> AsyncIterator[AgentEvent]:
        if not self._check_sdk():
            yield AgentEvent(
                type="error",
                content="Claude Agent SDK not installed. Run: pip install claude-agent-sdk"
            )
            return

        from claude_agent_sdk import (
            query,
            ClaudeAgentOptions,
            AssistantMessage,
            TextBlock,
            ToolUseBlock,
            ResultMessage,
        )

        options = ClaudeAgentOptions(
            system_prompt=system_prompt,
            cwd=cwd,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
            permission_mode="acceptEdits",
            max_turns=50,
        )

        try:
            async for message in query(prompt=user_prompt, options=options):
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            yield AgentEvent(type="text", content=block.text)
                        elif isinstance(block, ToolUseBlock):
                            yield AgentEvent(
                                type="tool_use",
                                content=block.name,
                                metadata={"tool": block.name}
                            )

                elif isinstance(message, ResultMessage):
                    yield AgentEvent(
                        type="complete",
                        content=f"Agent completed (cost: ${message.total_cost:.4f})",
                        metadata={"cost": message.total_cost}
                    )

        except Exception as e:
            yield AgentEvent(type="error", content=str(e))


# =============================================================================
# GEMINI BACKEND
# =============================================================================

class GeminiBackend(AgentBackend):
    """Backend using Gemini CLI via subprocess."""

    def __init__(self, model: str = "gemini-2.5-pro"):
        self.model = model
        self._cli_path = None

    def _find_gemini_cli(self) -> Optional[str]:
        """Find the gemini CLI executable."""
        if self._cli_path is not None:
            return self._cli_path

        # Try common locations
        import shutil

        # Check if 'gemini' is in PATH
        path = shutil.which("gemini")
        if path:
            self._cli_path = path
            return path

        # Check npm global bin
        try:
            result = subprocess.run(
                ["npm", "bin", "-g"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                npm_bin = result.stdout.strip()
                gemini_path = Path(npm_bin) / "gemini"
                if gemini_path.exists():
                    self._cli_path = str(gemini_path)
                    return self._cli_path
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        return None

    def get_name(self) -> str:
        return "Gemini CLI"

    async def run_agent(
        self,
        system_prompt: str,
        user_prompt: str,
        cwd: str,
        agent_name: str = "agent"
    ) -> AsyncIterator[AgentEvent]:
        cli_path = self._find_gemini_cli()
        if not cli_path:
            yield AgentEvent(
                type="error",
                content="Gemini CLI not found. Install with: npm install -g @google/gemini-cli"
            )
            return

        # Combine system prompt and user prompt for Gemini
        # Gemini CLI doesn't have a separate system prompt flag in non-interactive mode,
        # so we prepend the system instructions to the user prompt
        full_prompt = f"""## System Instructions
{system_prompt}

## Task
{user_prompt}"""

        # Build command with streaming JSON output
        cmd = [
            cli_path,
            "--output-format", "stream-json",
            "--model", self.model,
            "--yolo",  # Auto-accept tool calls (similar to Claude's acceptEdits)
            full_prompt
        ]

        try:
            # Run the process and stream output
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            async for event in self._parse_stream_json(process):
                yield event

            # Wait for process to complete
            await process.wait()

            if process.returncode != 0:
                stderr = await process.stderr.read()
                if stderr:
                    yield AgentEvent(
                        type="error",
                        content=f"Gemini CLI exited with code {process.returncode}: {stderr.decode()}"
                    )

        except Exception as e:
            yield AgentEvent(type="error", content=str(e))

    async def _parse_stream_json(
        self,
        process: asyncio.subprocess.Process
    ) -> AsyncIterator[AgentEvent]:
        """Parse streaming JSON events from Gemini CLI."""
        buffer = ""

        while True:
            chunk = await process.stdout.read(4096)
            if not chunk:
                break

            buffer += chunk.decode()

            # Process complete JSON lines
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue

                try:
                    event = json.loads(line)
                    yield self._convert_gemini_event(event)
                except json.JSONDecodeError:
                    # Not valid JSON, might be plain text output
                    if line:
                        yield AgentEvent(type="text", content=line)

    def _convert_gemini_event(self, event: dict) -> AgentEvent:
        """Convert Gemini CLI JSON event to AgentEvent."""
        event_type = event.get("type", "")

        if event_type == "message":
            content = event.get("content", "")
            role = event.get("role", "")
            if role == "assistant":
                return AgentEvent(type="text", content=content)
            return AgentEvent(type="text", content=f"[{role}] {content}")

        elif event_type == "tool_use":
            tool_name = event.get("tool_name", "unknown")
            return AgentEvent(
                type="tool_use",
                content=tool_name,
                metadata={
                    "tool": tool_name,
                    "tool_id": event.get("tool_id"),
                    "parameters": event.get("parameters")
                }
            )

        elif event_type == "tool_result":
            status = event.get("status", "unknown")
            output = event.get("output", "")
            return AgentEvent(
                type="tool_result",
                content=f"Tool {status}: {output[:200]}..." if len(output) > 200 else f"Tool {status}: {output}",
                metadata=event
            )

        elif event_type == "result":
            stats = event.get("stats", {})
            return AgentEvent(
                type="complete",
                content=f"Agent completed",
                metadata={"stats": stats}
            )

        elif event_type == "error":
            message = event.get("message", str(event))
            return AgentEvent(type="error", content=message)

        elif event_type == "init":
            return AgentEvent(
                type="text",
                content=f"Session started (model: {event.get('model', 'unknown')})",
                metadata=event
            )

        else:
            # Unknown event type, return as-is
            return AgentEvent(
                type="text",
                content=str(event.get("content", event)),
                metadata=event
            )


# =============================================================================
# AGENT SYSTEM PROMPTS (loaded as skills)
# =============================================================================

INITIALIZER_SYSTEM = """You are the TDD Initializer Agent. Your task is to analyze an app specification and create:

1. features.json - A structured list of features with test cases
2. Scaffolded test files with failing tests
3. Initial project structure

## Output Requirements
Create features.json with this schema:
{
  "project_name": "string",
  "features": [
    {
      "id": "F001",
      "name": "Feature name",
      "description": "What this feature does",
      "priority": 1,
      "dependencies": [],
      "status": "pending",
      "test_cases": [
        {
          "id": "T001",
          "description": "Test description",
          "test_file": "tests/test_feature.py::test_name",
          "status": "pending"
        }
      ],
      "files_modified": []
    }
  ]
}

## Rules
- Order features by dependency (implement dependencies first)
- Each feature should have 2-5 test cases
- Tests should be runnable but fail (import non-existent modules)
- Create actual test files, not just JSON
"""

FEATURE_AGENT_SYSTEM = """You are a TDD Feature Agent. Your job is to implement ONE feature and make its tests pass.

## Workflow
1. Read progress.txt for context from previous agents
2. Read the feature details from features.json
3. Run the tests to see current failures
4. Implement the minimum code to make tests pass
5. Run tests again to verify
6. Update progress.txt with context for the next agent
7. Update features.json to mark feature as complete

## Rules
- Do NOT modify tests unless they have bugs
- Follow existing code patterns from progress.txt
- Keep implementations minimal - just enough to pass tests
- Always update progress.txt before finishing
"""

COMMITTER_SYSTEM = """You are a TDD Committer Agent. Your job is to commit completed features with clean git history.

## Workflow
1. Verify tests pass for the feature
2. Stage only files related to this feature
3. Create a conventional commit message
4. Commit the changes
5. Update progress.txt with commit hash

## Commit Format
feat(<scope>): <subject>

<body>

Implements: <feature_id>
Tests: <passed>/<total> passed
"""


# =============================================================================
# ORCHESTRATOR
# =============================================================================

class TDDAutoRunner:
    def __init__(self, project_path: str, backend: BackendType = BackendType.CLAUDE):
        self.project_path = Path(project_path).resolve()
        self.features_file = self.project_path / "features.json"
        self.progress_file = self.project_path / "progress.txt"
        self.spec_file = self.project_path / "app_spec.md"
        self.logs_dir = self.project_path / ".tdd" / "agent_logs"

        self.config = {
            "max_retries_per_feature": 3,
            "test_command": "pytest",
        }

        # Initialize backend
        self.backend_type = backend
        self.backend = self._create_backend(backend)

    def _create_backend(self, backend_type: BackendType) -> AgentBackend:
        """Create the appropriate backend."""
        if backend_type == BackendType.CLAUDE:
            return ClaudeBackend()
        elif backend_type == BackendType.GEMINI:
            return GeminiBackend()
        else:
            raise ValueError(f"Unknown backend type: {backend_type}")

    def _load_features(self) -> Optional[dict]:
        """Load features.json if it exists."""
        if self.features_file.exists():
            return json.loads(self.features_file.read_text())
        return None

    def _save_features(self, data: dict):
        """Save features.json."""
        data["updated_at"] = datetime.now().isoformat()
        self.features_file.write_text(json.dumps(data, indent=2))

    def _get_next_feature(self) -> Optional[dict]:
        """Get the next pending feature with satisfied dependencies."""
        data = self._load_features()
        if not data:
            return None

        completed_ids = {f["id"] for f in data["features"] if f["status"] == "complete"}

        for feature in data["features"]:
            if feature["status"] == "pending":
                deps = set(feature.get("dependencies", []))
                if deps.issubset(completed_ids):
                    return feature

        return None

    def _log_agent_run(self, agent_type: str, feature_id: str, output: str):
        """Log agent output for debugging."""
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = self.logs_dir / f"{agent_type}_{feature_id}_{timestamp}.log"
        log_file.write_text(output)
        print(f"  📝 Log saved: {log_file.name}")

    async def _run_agent(
        self,
        system_prompt: str,
        user_prompt: str,
        agent_name: str = "agent"
    ) -> str:
        """
        Run a single agent with FRESH context window.

        This is the magic - each agent invocation is a completely new conversation.
        """
        print(f"\n{'='*60}")
        print(f"🤖 Spawning {agent_name} (fresh context) via {self.backend.get_name()}")
        print(f"{'='*60}")

        full_output = []

        async for event in self.backend.run_agent(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            cwd=str(self.project_path),
            agent_name=agent_name
        ):
            if event.type == "text":
                print(event.content)
                full_output.append(event.content)
            elif event.type == "tool_use":
                print(f"  🔧 Using tool: {event.content}")
            elif event.type == "tool_result":
                print(f"  📋 {event.content}")
            elif event.type == "complete":
                print(f"\n✅ {event.content}")
                if event.metadata:
                    full_output.append(f"Metadata: {json.dumps(event.metadata)}")
            elif event.type == "error":
                print(f"❌ Error: {event.content}")
                full_output.append(f"ERROR: {event.content}")

        return "\n".join(full_output)

    async def initialize(self, spec_content: str):
        """Run the initializer agent to create features.json."""
        # Create project structure
        self.project_path.mkdir(parents=True, exist_ok=True)
        (self.project_path / "src").mkdir(exist_ok=True)
        (self.project_path / "tests").mkdir(exist_ok=True)

        # Write spec file
        self.spec_file.write_text(spec_content)

        # Initialize progress.txt
        self.progress_file.write_text(f"""=== TDD Progress Report ===
Project: {self.project_path.name}
Last Updated: {datetime.now().isoformat()}

## Completed Features
(none yet)

## Current Feature
Awaiting initialization...

## Context for Next Agent
Project just initialized. Initializer agent creating features.

## File Summary
- app_spec.md: Original specification
""")

        prompt = f"""Analyze this app specification and create features.json with test cases.
Then scaffold the project with failing tests.

## App Specification
{spec_content}

## Working Directory
{self.project_path}

Create:
1. features.json with all features and test cases
2. Test files in tests/ with failing tests
3. Basic project structure in src/
4. Update progress.txt when done
"""

        output = await self._run_agent(
            INITIALIZER_SYSTEM,
            prompt,
            "Initializer Agent"
        )

        self._log_agent_run("initializer", "INIT", output)

        # Verify features.json was created
        if self.features_file.exists():
            data = self._load_features()
            print(f"\n✅ Initialized with {len(data['features'])} features")
            return True
        else:
            print("\n❌ Initializer failed to create features.json")
            return False

    async def implement_feature(self, feature: dict) -> bool:
        """Run a feature agent to implement one feature."""
        feature_id = feature["id"]
        feature_name = feature["name"]

        # Read current progress for context
        progress_content = self.progress_file.read_text() if self.progress_file.exists() else ""

        prompt = f"""Implement this feature and make all tests pass.

## Feature
ID: {feature_id}
Name: {feature_name}
Description: {feature['description']}

## Test Cases
{json.dumps(feature['test_cases'], indent=2)}

## Progress from Previous Agents
{progress_content}

## Instructions
1. Read the existing codebase
2. Run tests to see failures: pytest tests/ -v
3. Implement the feature
4. Run tests until they pass
5. Update progress.txt with:
   - Mark feature complete
   - Add context for next agent
   - List files you modified
6. Update features.json to mark status as "complete"
"""

        output = await self._run_agent(
            FEATURE_AGENT_SYSTEM,
            prompt,
            f"Feature Agent ({feature_id})"
        )

        self._log_agent_run("feature", feature_id, output)

        # Check if feature is now complete
        data = self._load_features()
        for f in data["features"]:
            if f["id"] == feature_id and f["status"] == "complete":
                return True

        return False

    async def commit_feature(self, feature: dict) -> bool:
        """Run committer agent to commit the feature."""
        feature_id = feature["id"]

        prompt = f"""Commit the completed feature {feature_id}: {feature['name']}

## Instructions
1. Run tests to verify they pass
2. Stage files related to this feature (check features.json for files_modified)
3. Create a conventional commit
4. Update progress.txt with the commit hash

Do NOT commit if tests fail.
"""

        output = await self._run_agent(
            COMMITTER_SYSTEM,
            prompt,
            f"Committer Agent ({feature_id})"
        )

        self._log_agent_run("committer", feature_id, output)
        return True

    async def run(self):
        """Main orchestration loop."""
        print("\n" + "="*60)
        print(f"🚀 TDD Auto-Runner Starting (backend: {self.backend.get_name()})")
        print("="*60)

        if not self.features_file.exists():
            print("❌ No features.json found. Run initialize() first.")
            return

        iteration = 0
        max_iterations = 50  # Safety limit

        while iteration < max_iterations:
            iteration += 1

            feature = self._get_next_feature()

            if feature is None:
                # Check if all done
                data = self._load_features()
                completed = sum(1 for f in data["features"] if f["status"] == "complete")
                total = len(data["features"])

                if completed == total:
                    print(f"\n🎉 All {total} features complete!")
                    break
                else:
                    failed = sum(1 for f in data["features"] if f["status"] == "failed")
                    print(f"\n⚠️ Stuck: {completed}/{total} complete, {failed} failed")
                    break

            print(f"\n📋 Feature {iteration}: {feature['id']} - {feature['name']}")

            # Implement feature (fresh context)
            success = await self.implement_feature(feature)

            if success:
                print(f"✅ {feature['id']} implemented successfully")

                # Commit (fresh context)
                await self.commit_feature(feature)
            else:
                # Handle retry logic
                data = self._load_features()
                for f in data["features"]:
                    if f["id"] == feature["id"]:
                        f["retry_count"] = f.get("retry_count", 0) + 1
                        if f["retry_count"] >= self.config["max_retries_per_feature"]:
                            f["status"] = "failed"
                            print(f"❌ {feature['id']} failed after {f['retry_count']} attempts")
                        break
                self._save_features(data)

        print("\n" + "="*60)
        print("🏁 TDD Auto-Runner Complete")
        print("="*60)


# =============================================================================
# CLI
# =============================================================================

def parse_backend(backend_str: str) -> BackendType:
    """Parse backend string to BackendType enum."""
    backend_str = backend_str.lower()
    if backend_str == "claude":
        return BackendType.CLAUDE
    elif backend_str == "gemini":
        return BackendType.GEMINI
    else:
        raise ValueError(f"Unknown backend: {backend_str}. Use 'claude' or 'gemini'.")


async def main():
    if len(sys.argv) < 3:
        print("""
TDD Auto-Runner - Autonomous coding with fresh-context agents

Usage:
    python auto_runner.py init <project_path> <spec_file> [--backend claude|gemini]
    python auto_runner.py run <project_path> [--backend claude|gemini]
    python auto_runner.py status <project_path>

Options:
    --backend, -b    Choose agent backend: 'claude' (default) or 'gemini'

Examples:
    # Using Claude (default)
    python auto_runner.py init ./my-app spec.md
    python auto_runner.py run ./my-app

    # Using Gemini CLI
    python auto_runner.py init ./my-app spec.md --backend gemini
    python auto_runner.py run ./my-app -b gemini

Backend Requirements:
    claude: pip install claude-agent-sdk anyio
    gemini: npm install -g @google/gemini-cli
""")
        sys.exit(1)

    # Parse arguments
    command = sys.argv[1]
    project_path = sys.argv[2]

    # Extract backend option
    backend = BackendType.CLAUDE  # default
    args = sys.argv[3:]
    filtered_args = []

    i = 0
    while i < len(args):
        if args[i] in ("--backend", "-b"):
            if i + 1 < len(args):
                backend = parse_backend(args[i + 1])
                i += 2
            else:
                print("❌ --backend requires a value (claude or gemini)")
                sys.exit(1)
        else:
            filtered_args.append(args[i])
            i += 1

    runner = TDDAutoRunner(project_path, backend=backend)

    if command == "init":
        if len(filtered_args) < 1:
            print("❌ Please provide spec file path")
            sys.exit(1)

        spec_file = Path(filtered_args[0])
        if not spec_file.exists():
            print(f"❌ Spec file not found: {spec_file}")
            sys.exit(1)

        spec_content = spec_file.read_text()
        await runner.initialize(spec_content)

    elif command == "run":
        await runner.run()

    elif command == "status":
        if runner.features_file.exists():
            data = runner._load_features()
            total = len(data["features"])
            complete = sum(1 for f in data["features"] if f["status"] == "complete")
            failed = sum(1 for f in data["features"] if f["status"] == "failed")
            pending = total - complete - failed

            print(f"\n📊 Project: {data.get('project_name', 'Unknown')}")
            print(f"   Total:    {total} features")
            print(f"   Complete: {complete}")
            print(f"   Failed:   {failed}")
            print(f"   Pending:  {pending}")

            print("\n📋 Features:")
            for f in data["features"]:
                status_icon = {"complete": "✅", "failed": "❌", "pending": "⏳"}.get(f["status"], "?")
                print(f"   {status_icon} {f['id']}: {f['name']}")
        else:
            print("❌ No features.json found")

    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
