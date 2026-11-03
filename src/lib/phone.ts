/** Normalize phone to 8 digits (XXXXXXXX) for API validation */
export function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 8);
}
