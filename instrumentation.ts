import { start as registerBackupTask } from './lib/tasks/backup'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'production') {
      registerBackupTask();
    }
  }
}
