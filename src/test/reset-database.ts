import { db } from "@/features/storage/db";

export async function resetDatabase(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}
