/** Normalize phone to XX XXX XXX (8 digits) for API validation */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 8) {
    const d = digits.slice(-8);
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)}`;
  }
  return phone.trim();
}
