BACKUP_DIR=${BACKUP_DIR:-.}
sudo -u postgres pg_dump -d note2db -F custom > "$BACKUP_DIR/backup.custom"
