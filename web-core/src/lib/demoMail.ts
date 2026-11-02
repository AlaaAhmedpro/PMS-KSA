import { LS } from "../demo-mode/keys";
import { loadJson, saveJson } from "../demo-mode/storage";

export interface DemoMailMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  kind: "temp_password" | "activation" | "resend";
}

export function listSentMail(): DemoMailMessage[] {
  return loadJson<DemoMailMessage[]>(LS.sentMail, []);
}

export function pushSentMail(
  msg: Omit<DemoMailMessage, "id" | "createdAt">,
): DemoMailMessage {
  const row: DemoMailMessage = {
    ...msg,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const prev = listSentMail();
  saveJson(LS.sentMail, [row, ...prev].slice(0, 40));
  return row;
}

export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "Tmp-";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
