---
name: copy-prompts-to-cline-cursor
description: Delete all files in the Cline workflows and Cursor commands directories, then copy every .prompt.md file from .github/prompts/ into both targets.
agent: agent
---

# Copy Prompt Files To Cline And Cursor

Synchronize all `.prompt.md` files from the central prompts directory into both the Cline workflows directory and the Cursor commands directory by wiping the targets and copying fresh files.

## Variables

| Variable | Value |
|---|---|
| **Source** | `/Users/juan/src/github.com/IBS.IDE.AI.Tasks.Workflows/.github/prompts` |
| **Cline target** | `/Users/juan/Documents/Cline/Workflows` |
| **Cursor target** | `/Users/juan/src/github.com/aboveproperty/.cursor/commands` |

## Steps

1. **Wipe** — delete every file (and broken symlink) in both target directories. Do not delete the directories themselves.
2. **Copy** — for every `.prompt.md` file in the source directory, copy it into each target directory with the same filename.
3. **Verify** — list both target directories and confirm all prompt files were copied correctly.
4. Report a summary: number of files copied, any errors.

## Shell Commands

Run in a single terminal session:

```bash
SOURCE="$HOME/src/github.com/IBS.IDE.AI.Tasks.Workflows/.github/prompts"
CLINE="$HOME/Documents/Cline/Workflows"
CURSOR="$HOME/src/github.com/aboveproperty/.cursor/commands"

echo "🗑  Wiping target directories..."
find "$CLINE"  -maxdepth 1 -not -type d -delete
find "$CURSOR" -maxdepth 1 -not -type d -delete

echo "📄 Copying prompt files..."
for f in "$SOURCE"/*.prompt.md; do
  name=$(basename "$f")
  cp "$f" "$CLINE/$name"  && echo "  ✓ cline  → $name"
  cp "$f" "$CURSOR/$name" && echo "  ✓ cursor → $name"
done

echo ""
echo "📂 Cline workflows:"
ls -la "$CLINE"
echo ""
echo "📂 Cursor commands:"
ls -la "$CURSOR"
```

## Invocation Examples

- `/copy-prompts-to-cline-cursor`