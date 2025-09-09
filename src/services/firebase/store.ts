import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { Order, OrderItem, Product } from "@/types/models";

export async function listProducts(category?: string) {
  const base = collection(db, COL.products);
  const q = category ? query(base, where("category", "==", category)) : base;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[];
}

export async function getProduct(productId: string) {
  const ref = doc(db, COL.products, productId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Product) : null;
}

export async function createOrder(items: OrderItem[]) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const ref = await addDoc(collection(db, COL.orders), {
    userId: user.uid,
    items,
    total,
    status: "created",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdAtTs: serverTimestamp(),
  });
  return ref.id;
}

export async function listOrdersForUser(userId: string) {
  const q = query(collection(db, COL.orders), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Order[];
}
