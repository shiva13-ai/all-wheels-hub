import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { ChatRoom, Message } from "@/types/models";

export async function ensureChatRoom(participantIds: string[], type: ChatRoom["type"], bookingId?: string) {
  const q = query(
    collection(db, COL.chatRooms),
    where("participantIds", "array-contains", participantIds[0]),
    where("type", "==", type)
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => {
    const arr = (d.data() as any).participantIds as string[];
    const same = arr.length === participantIds.length && participantIds.every((id) => arr.includes(id));
    const sameBooking = (d.data() as any).bookingId === bookingId;
    return same && (type === "booking" ? sameBooking : true);
  });
  if (existing) return existing.id;

  const ref = await addDoc(collection(db, COL.chatRooms), {
    participantIds,
    type,
    bookingId: bookingId || null,
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
    createdAtTs: serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessage(roomId: string, text: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const ref = await addDoc(collection(doc(db, COL.chatRooms, roomId), COL.messages), {
    senderId: user.uid,
    text,
    createdAt: Date.now(),
    createdAtTs: serverTimestamp(),
  });
  await setDoc(doc(db, COL.chatRooms, roomId), { lastMessageAt: Date.now() }, { merge: true });
  return ref.id;
}

export function listenMessages(roomId: string, cb: (messages: Message[]) => void) {
  const q = query(collection(doc(db, COL.chatRooms, roomId), COL.messages), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[];
    cb(list);
  });
}
