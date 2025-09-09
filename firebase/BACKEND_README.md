# Firebase backend scaffolding for All Wheels Hub / ServiceHub

This project includes Firebase client modules and example Firestore Security Rules + Indexes.

What’s included:
- src/lib/firebase.ts – Firebase app init
- src/types/models.ts – Shared TypeScript models
- src/services/firebase/* – Client-side service modules for: profiles, bookings, mechanics, reviews, store/orders, chat, SOS, notifications
- firestore.rules – Example Firestore security rules (deploy from Firebase project)
- firestore.indexes.json – Suggested composite indexes

How to apply rules and indexes:
1) Install the Firebase CLI and initialize Firestore in your Firebase project (outside Lovable):
   npm i -g firebase-tools
   firebase login
   firebase use autoaid-92b2a
2) Place firestore.rules and firestore.indexes.json into your Firebase repo (or deploy directly):
   firebase deploy --only firestore:rules
   firebase firestore:indexes

Cloud Functions (optional):
- You can add functions like: onCreate(bookings) to notify mechanics, onWrite(reviews) to update ratings, payment webhooks, etc.
- Create a separate Functions repo (Node 18+). Example stub:

```ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

export const onReviewWrite = functions.firestore
  .document("reviews/{id}")
  .onWrite(async (change, ctx) => {
    const after = change.after.data();
    if (!after) return;
    const mechanicId = after.mechanicId as string;
    const snap = await admin.firestore().collection("reviews").where("mechanicId","==",mechanicId).get();
    const ratings = snap.docs.map(d => d.data().rating as number);
    const avg = ratings.reduce((a,b)=>a+b,0) / Math.max(ratings.length,1);
    await admin.firestore().doc(`profiles/${mechanicId}`).set({ ratingAvg: avg, ratingCount: ratings.length }, { merge: true });
  });
```

Note: Deploy Cloud Functions from your own environment; Lovable doesn’t host server code.
