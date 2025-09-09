import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { UserProfile } from "@/types/models";

export async function getMyProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const ref = doc(db, COL.profiles, user.uid);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ uid: snap.id, ...(snap.data() as any) } as UserProfile) : null;
}

export async function upsertMyProfile(patch: Partial<UserProfile>) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = doc(db, COL.profiles, user.uid);
  const existing = await getDoc(ref);
  const base: UserProfile = existing.exists()
    ? ({ uid: user.uid, ...(existing.data() as any) } as UserProfile)
    : ({ uid: user.uid, role: "user", createdAt: Date.now(), updatedAt: Date.now() } as UserProfile);
  const next: UserProfile = { ...base, ...patch, uid: user.uid, updatedAt: Date.now() };
  await setDoc(ref, next, { merge: true });
}
