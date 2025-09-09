import { collection, getDocs, query, updateDoc, where, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { AppNotification } from "@/types/models";

export async function listMyNotifications() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const q = query(collection(db, COL.notifications), where("userId", "==", user.uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AppNotification[];
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, COL.notifications, id), { read: true });
}
