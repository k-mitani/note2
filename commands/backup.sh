BACKUP_DIR=${BACKUP_DIR:-.}
sudo -u postgres pg_dump -d note2db -F custom > "$BACKUP_DIR/backup.custom"

# 日曜日の場合、backup.customを日付付きで複製
DAY_OF_WEEK=$(date +%u)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    CURRENT_DATE=$(date +%Y%m%d)
    cp "$BACKUP_DIR/backup.custom" "$BACKUP_DIR/backup_${CURRENT_DATE}.custom"
fi
