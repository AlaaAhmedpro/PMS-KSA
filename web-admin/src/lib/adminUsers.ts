import type { User } from "./types";

/** مستخدمو منصة Super Admin فقط */
export const ADMIN_USERS: User[] = [
  {
    id: "pa1",
    name: "نورة فهد الشمري",
    email: "platform@namaa.sa",
    role: "platform_admin",
    active: true,
  },
  {
    id: "pa2",
    name: "سلطان عبدالعزيز الحربي",
    email: "ops@namaa.sa",
    role: "platform_admin",
    active: true,
  },
  {
    id: "pa3",
    name: "لمى سعد القحطاني",
    email: "sales@namaa.sa",
    role: "platform_admin",
    active: true,
  },
];
