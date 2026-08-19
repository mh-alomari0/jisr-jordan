export type ContactSignal = "EMAIL" | "PHONE" | "EXTERNAL_URL" | "SOCIAL_CONTACT" | "EXTERNAL_PAYMENT";

const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const latinDigits = "0123456789";

export function detectContactSignals(input: string): ContactSignal[] {
  const normalized = input.toLowerCase().replace(/[٠-٩]/g, (digit) => latinDigits[arabicDigits.indexOf(digit)] || digit);
  const compact = normalized.replace(/[\s.()_-]+/g, "");
  const signals: ContactSignal[] = [];
  if (/[\w.%+-]+\s*@\s*[\w.-]+\.[a-z]{2,}/i.test(normalized)) signals.push("EMAIL");
  if (/(?:\+?962|0)?7[789]\d{7}/.test(compact)) signals.push("PHONE");
  if (/(?:https?:\/\/|www\.)/i.test(normalized)) signals.push("EXTERNAL_URL");
  if (/(?:واتس|واتساب|whatsapp|تلغرام|تيليغرام|telegram|سناب|snapchat|انستغرام|instagram|فيسبوك|facebook)[\s\p{P}]*[@\p{L}\p{N}_+.-]{3,}/iu.test(normalized)) signals.push("SOCIAL_CONTACT");
  if (/(?:كليك|cliq|paypal|باي\s*بال|تحويل\s+(?:خارجي|مباشر|بنكي)|رقم\s+الحساب|iban)/iu.test(normalized)) signals.push("EXTERNAL_PAYMENT");
  return [...new Set(signals)];
}

export const PREBOOKING_CONTACT_WARNING = "للحفاظ على حقوقك، لا تضف رقم هاتف أو بريد أو رابط تواصل أو وسيلة دفع خارج جسر قبل تأكيد الحجز.";
