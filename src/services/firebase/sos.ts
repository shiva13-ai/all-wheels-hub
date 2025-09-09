import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { SosRequest } from "@/types/models";

export async function createSosRequest(input: Omit<SosRequest, "id" | "status" | "createdAt" | "updatedAt" | "userId">) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = await addDoc(collection(db, COL.sosRequests), {
    ...input,
    userId: user.uid,
    status: "open",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateSosStatus(id: string, status: SosRequest["status"]) {
  await updateDoc(doc(db, COL.sosRequests, id), { status, updatedAt: Date.now() });
}
