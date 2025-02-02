import { exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import schedule from 'node-schedule';

const execAsync = promisify(exec);

export async function runBackup() {
  try {
    const scriptPath = join(process.cwd(), 'commands', 'backup.sh');
    const { stdout, stderr } = await execAsync(`bash ${scriptPath}`);
    
    if (stderr) {
      console.error('Backup error:', stderr);
    } else {
      console.log('Backup completed successfully:', stdout);
    }
  } catch (error) {
    console.error('Failed to run backup:', error);
  }
}

export function start() {
  schedule.scheduleJob('0 3 * * *', () => {
    runBackup();
  });

  console.log('バックアップタスク登録完了!');
}
