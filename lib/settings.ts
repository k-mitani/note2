import {prisma} from "@/lib/prisma";

enum Key {
  shareTargetFolderId,
}

async function getValue<T>(key: Key): Promise<T | null> {
  const kv = await prisma.keyValue.findFirst({
    where: {key: Key[key]},
  });

  if (kv === null) return null;
  return kv.value as any as T;
}

async function setValue<T>(key: Key, value: T): Promise<void> {
  await prisma.keyValue.upsert({
    where: {key: Key[key]},
    update: {value: value as any},
    create: {key: Key[key], value: value as any},
  });
}

class SettingsManager {
  async getShareTargetFolderId(): Promise<number> {
    let val = await getValue<number>(Key.shareTargetFolderId);
    if (val === null) {
      val = 1;
      await setValue(Key.shareTargetFolderId, val);
    }
    return val;
  }
  async setShareTargetFolderId(value: number): Promise<void> {
    await setValue(Key.shareTargetFolderId, value);
  }
}

const settings = new SettingsManager();
export default settings;
