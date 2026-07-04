# Codex CLI integration

Codex reads skills from `~/.codex/skills/` using the same `SKILL.md` format as
Claude Code. Keep one source of truth and symlink it:

```bash
mkdir -p ~/.claude/skills ~/.codex/skills
cp -r integrations/claude-code ~/.claude/skills/board   # if not installed yet
ln -sfn ~/.claude/skills/board ~/.codex/skills/board
```

New Codex sessions (including every `codex exec`) pick the skill up automatically;
already-running sessions scan skills at startup, so start a new conversation.
