import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { Review } from "@/types/models";

export async function addReview(input: Omit<Review, "id" | "createdAt">) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (user.uid !== input.userId) throw new Error("userId must match current user");

  const ref = await addDoc(collection(db, COL.reviews), {
    ...input,
    createdAt: Date.now(),
  });
  return ref.id;
}
