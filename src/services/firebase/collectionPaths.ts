// Collection names and helpers
export const COL = {
  profiles: "profiles",
  services: "services",
  bookings: "bookings",
  reviews: "reviews",
  products: "products",
  orders: "orders",
  chatRooms: "chatRooms",
  messages: "messages", // subcollection under chatRooms/{id}
  sosRequests: "sosRequests",
  notifications: "notifications",
} as const;
