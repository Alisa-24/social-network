import { API_URL } from "@/lib/config";

export async function sendOTP(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/api/otp/send`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

export async function verifyOTP(code: string): Promise<{ success: boolean; message: string; user?: any }> {
  const res = await fetch(`${API_URL}/api/otp/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return res.json();
}
