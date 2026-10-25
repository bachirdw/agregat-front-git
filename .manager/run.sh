#!/bin/zsh
# Usage: .manager/run.sh <id>   (EFFORT=high|xhigh)
set -u
cd /Users/diaw/Downloads/agregateur-frontend
TS=$(date +%Y%m%d-%H%M%S); LOG=.manager/logs/$1-$TS.jsonl
PROMPT="Tu es l'ingénieur principal de ce frontend, supervisé par un manager. Lis AGENTS.md puis exécute intégralement le brief .manager/briefs/$1.md. Prends ton temps, vérifie tout, tiens le rapport .manager/reports/$1.md à jour au fil de l'eau, y compris les erreurs. Ne t'arrête que lorsque le brief est accompli ou réellement bloqué."
codex exec -m gpt-6.1-sol -c model_reasoning_effort=\"${EFFORT:-medium}\" -c sandbox_workspace_write.network_access=true \
  --add-dir /Users/diaw/Downloads/agregateur-agent --add-dir /Users/diaw/Downloads/agent-repos --approve-for-me --skip-git-repo-check \
  --json -o .manager/logs/$1-$TS.last.md "$PROMPT" < /dev/null > "$LOG" 2>&1
echo "EXIT=$? LOG=$LOG"
