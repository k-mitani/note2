# AGENTS.md

## Deployment

After changes that include Prisma migrations or production code updates, use:

```bash
./commands/deploy-note2.sh
```

This applies pending Prisma migrations, builds the Next.js app, restarts `note2.service`, and prints the service status.
