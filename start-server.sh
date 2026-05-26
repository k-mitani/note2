#!/usr/bin/env bash
set -euo pipefail

export PATH="/home/ubuntu/.nvm/versions/node/v24.14.1/bin:$PATH"

cd /soft/note2
exec npm run start
