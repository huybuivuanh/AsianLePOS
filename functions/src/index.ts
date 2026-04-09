import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Query } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

initializeApp();

/** ~30 days; Firestore cleanup uses a fixed window, not calendar months. */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

const ORDER_COLLECTIONS = ["dineInOrders", "takeOutOrders"] as const;

async function deleteQueryInBatches(query: Query): Promise<number> {
  const snapshot = await query.limit(BATCH_SIZE).get();
  if (snapshot.empty) return 0;

  const db = getFirestore();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  const deleted = snapshot.size;
  const rest = await deleteQueryInBatches(query);
  return deleted + rest;
}

/**
 * Deletes documents where createdAt is older than ~30 days.
 * Runs daily (UTC). Requires Blaze + deploy: `firebase deploy --only functions`
 */
export const purgeStaleOrders = onSchedule(
  {
    schedule: "0 4 * * *",
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore();
    const cutoff = Timestamp.fromMillis(Date.now() - RETENTION_MS);
    let total = 0;

    for (const name of ORDER_COLLECTIONS) {
      const q = db.collection(name).where("createdAt", "<", cutoff);
      const n = await deleteQueryInBatches(q);
      total += n;
      logger.info(`purgeStaleOrders: deleted ${n} from ${name}`);
    }

    logger.info(`purgeStaleOrders: finished, total deleted ${total}`);
  },
);
