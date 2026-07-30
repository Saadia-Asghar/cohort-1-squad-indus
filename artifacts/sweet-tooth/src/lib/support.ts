export const SUPPORT_EMAIL = "saadianigah@gmail.com";
export const SUPPORT_WHATSAPP = "923159127771";

export function whatsappSupportLink(message: string) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
