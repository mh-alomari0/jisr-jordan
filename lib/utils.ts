import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatJordanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("962")) {
    return "0" + cleaned.slice(3);
  }
  return cleaned;
}

export function validateJordanPhone(phone: string): boolean {
  const cleaned = formatJordanPhone(phone);
  return /^07\d{8}$/.test(cleaned);
}