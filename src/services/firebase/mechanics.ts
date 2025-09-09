import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { UserProfile } from "@/types/models";

export async function getMechanicProfile(mechanicId: string) {
  const ref = doc(db, COL.profiles, mechanicId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ uid: snap.id, ...(snap.data() as any) } as UserProfile) : null;
}

export async function listMechanicsByService(service: string) {
  const q = query(
    collection(db, COL.profiles),
    where("role", "==", "mechanic"),
    where("servicesOffered", "array-contains", service)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })) as UserProfile[];
}
