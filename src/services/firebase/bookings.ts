import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COL } from "./collectionPaths";
import type { Booking, BookingStatus } from "@/types/models";

const nowMs = () => Date.now();

export async function createBooking(input: Omit<Booking, "id" | "status" | "createdAt" | "updatedAt">) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (user.uid !== input.userId) throw new Error("userId must match current user");

  const ref = await addDoc(collection(db, COL.bookings), {
    ...input,
    status: "pending" as BookingStatus,
    createdAt: nowMs(),
    updatedAt: nowMs(),
    createdAtTs: serverTimestamp(), // for ordering via indexes
  });
  return ref.id;
}

export async function listBookingsForUser(userId: string) {
  const q = query(
    collection(db, COL.bookings),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Booking[];
}

export async function listBookingsForMechanic(mechanicId: string) {
  const q = query(
    collection(db, COL.bookings),
    where("mechanicId", "==", mechanicId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Booking[];
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const ref = doc(db, COL.bookings, bookingId);
  await updateDoc(ref, { status, updatedAt: nowMs() });
}
