# .clinerules
version: 1

rules:
  # 👇 General Style and Tone
  - id: tone
    match: "*"
    instruction: >
      Write in a concise, professional tone. Use emojis sparingly (✅, ⚠️, 🧠)
      for clarity, not decoration.

  # 👇 Default Repository Context
  - id: repo_context
    match: "*"
    instruction: >
      Assume all workflows and commands refer to the current repository unless
      a different path is explicitly provided.

  # 👇 Commit Message Convention
  - id: commit_messages
    match: "*"
    instruction: >
      When generating commit messages, always follow the Conventional Commits
      standard: type(scope): short summary. Wrap body text at 100 characters.

  # 👇 File Editing
  - id: file_editing
    match: "*.yaml, *.json, *.conf"
    instruction: >
      Keep indentation consistent (2 spaces). Maintain comments. Preserve order of keys.

  # 👇 Shell Commands
  - id: shell_execution
    match: "*.sh, *.bash, shell"
    instruction: >
      Never include destructive commands like 'rm -rf' unless explicitly approved.
      Prefer readable 'echo' status lines for each step.

  # 👇 Logging and Output
  - id: output
    match: "*"
    instruction: >
      After executing workflows, summarize the outcome with ✅ or ❌, then list
      key changes or actions taken.

  # 👇 Workflow Naming
  - id: workflow_naming
    match: "workflows/*.md"
    instruction: >
      Start workflow names with an emoji and a short descriptor (e.g., '🚀 Start Dev Env',
      '🧠 Commit Helper'). Keep under 4 words.
  
  # 👇 Workflow Namingd    
  - id: shared_workflows
    match: "*"
    instruction: >
      Allow importing workflows from external path
      ~/Projects/IBS.IDE.AI.Tasks.Workflows/workflows/.
      When a command starts with /@ibs/, resolve it from that directory.