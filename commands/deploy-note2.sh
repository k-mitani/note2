#!/usr/bin/env bash
#set -euo pipefail

export PATH="/home/ubuntu/.nvm/versions/node/v24.14.1/bin:$PATH"

cd /soft/note2

npx prisma migrate deploy
npx prisma generate
npx next build
sudo systemctl restart note2.service
sudo systemctl status note2.service --no-pager
