import { api } from "./api";

export type AttendanceStatus =
  | "PENDING"
  | "CONFIRMED"
  | "MAYBE"
  | "NOT_GOING";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
};

export type AdminDashboard = {
  guests: {
    total: number;
    confirmed: number;
    maybe: number;
    notGoing: number;
    pending: number;
  };
  people: {
    confirmed: number;
    companions: number;
  };
  gifts: {
    active: number;
    totalChoices: number;
  };
};

export type AdminGuest = {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  attendance: AttendanceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  companions: Array<{
    id: string;
    name: string;
  }>;
  giftChoices: Array<{
    id: string;
    giftId: string;
    createdAt: string;
    gift: {
      id: string;
      title: string;
      type: "MONEY" | "PHYSICAL";
    };
  }>;
};

export type AdminGift = {
  id: string;
  title: string;
  description: string | null;
  type: "MONEY" | "PHYSICAL";
  suggestedAmount: number | null;
  externalUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    guestChoices: number;
  };
  guestChoices: Array<{
    id: string;
    createdAt: string;
    guest: {
      id: string;
      name: string;
      phone: string;
    };
  }>;
};

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{
  accessToken: string;
  admin: AdminUser;
}> {
  const response = await api.post("/admin/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function getAdminMe(): Promise<AdminUser> {
  const response = await api.get("/admin/auth/me");
  return response.data;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const response = await api.get("/admin/dashboard");
  return response.data;
}

export async function getAdminGuests(): Promise<AdminGuest[]> {
  const response = await api.get("/admin/guests");
  return Array.isArray(response.data) ? response.data : [];
}

export async function updateAdminGuest(
  guestId: string,
  data: {
    name?: string;
    phone?: string;
    attendance?: AttendanceStatus;
    notes?: string | null;
  },
): Promise<AdminGuest> {
  const response = await api.patch(`/admin/guests/${guestId}`, data);
  return response.data;
}

export async function updateAdminGuestCompanions(
  guestId: string,
  companions: string[],
): Promise<AdminGuest> {
  const response = await api.put(
    `/admin/guests/${guestId}/companions`,
    { companions },
  );

  return response.data;
}

export async function deleteAdminGuest(
  guestId: string,
): Promise<void> {
  await api.delete(`/admin/guests/${guestId}`);
}

export async function removeAdminGuestGift(
  guestId: string,
  giftId: string,
): Promise<void> {
  await api.delete(`/admin/guests/${guestId}/gifts/${giftId}`);
}

export async function getAdminGifts(): Promise<AdminGift[]> {
  const response = await api.get("/admin/gifts");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createAdminGift(data: {
  title: string;
  description?: string | null;
  type: "MONEY" | "PHYSICAL";
  suggestedAmount?: number | null;
  externalUrl?: string | null;
  sortOrder?: number;
}): Promise<AdminGift> {
  const response = await api.post("/admin/gifts", data);
  return response.data;
}

export async function updateAdminGift(
  giftId: string,
  data: {
    title?: string;
    description?: string | null;
    type?: "MONEY" | "PHYSICAL";
    suggestedAmount?: number | null;
    externalUrl?: string | null;
    active?: boolean;
    sortOrder?: number;
  },
): Promise<AdminGift> {
  const response = await api.patch(`/admin/gifts/${giftId}`, data);
  return response.data;
}

export async function deleteAdminGift(
  giftId: string,
): Promise<void> {
  await api.delete(`/admin/gifts/${giftId}`);
}
