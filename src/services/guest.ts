import { api } from "./api";

export type AttendanceStatus =
  | "PENDING"
  | "CONFIRMED"
  | "MAYBE"
  | "NOT_GOING";

export type Guest = {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  attendance: AttendanceStatus;
  companions: Array<{
    id: string;
    name: string;
    phone: string | null;
  }>;
  giftIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CompanionSession = {
  id: string;
  name: string;
  phone: string | null;
  invitedBy: { id: string; name: string };
  giftIds: string[];
};

export type Gift = {
  id: string;
  title: string;
  description: string | null;
  type: "MONEY" | "PHYSICAL";
  suggestedAmount: number | null;
  externalUrl: string | null;
  sortOrder: number;
};

export async function accessGuest(
  name: string,
  phone: string,
): Promise<{
  accessToken: string;
  role: "guest" | "companion";
  guest?: Guest;
  companion?: CompanionSession;
}> {
  const response = await api.post("/guest/access", {
    name,
    phone,
  });

  return response.data;
}

export async function getGuestMe(): Promise<Guest> {
  const response = await api.get("/guest/me");
  return response.data;
}

export async function getCompanionMe(): Promise<CompanionSession> {
  return (await api.get("/guest/companion/me")).data;
}

export async function updateAttendance(
  attendance: AttendanceStatus,
): Promise<Guest> {
  const response = await api.patch("/guest/attendance", {
    attendance,
  });

  return response.data;
}

export async function updateCompanions(
  companions: Array<{ name: string; phone: string }>,
): Promise<Guest> {
  const response = await api.put("/guest/companions", {
    companions,
  });

  return response.data;
}

export async function chooseCompanionGift(giftId: string): Promise<void> {
  await api.post(`/companion/gifts/${giftId}`);
}

export async function removeCompanionGiftChoice(giftId: string): Promise<void> {
  await api.delete(`/companion/gifts/${giftId}`);
}

export async function getGifts(): Promise<Gift[]> {
  const response = await api.get("/gifts");
  return Array.isArray(response.data) ? response.data : [];
}

export async function chooseGift(giftId: string): Promise<void> {
  await api.post(`/guest/gifts/${giftId}`);
}

export async function removeGiftChoice(
  giftId: string,
): Promise<void> {
  await api.delete(`/guest/gifts/${giftId}`);
}
