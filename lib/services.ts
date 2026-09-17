export type ResourceType = "PC_NORMAL" | "PC_MASTER" | "PS5" | "CINEMA" | "BILLIARD" | "TABLE";

export type Service = {
  type: ResourceType;
  title: string;
  arTitle: string;
  description: string;
  price: number;
  unit: string;
  count: number;
  tone: "cyan" | "violet" | "pink" | "blue";
  icon: string;
  image: string;
};

export const SERVICES: Service[] = [
  { type: "PS5", title: "PLAYSTATION 5", arTitle: "PlayStation 5", description: "تجربة لعب حصرية على بلايستيشن 5", price: 5000, unit: "ساعة", count: 10, tone: "blue", icon: "01", image: "/reference-cards/ps5.jpg" },
  { type: "PC_MASTER", title: "PC MASTER", arTitle: "PC ماستر", description: "أعلى مواصفات لأفضل أداء", price: 4000, unit: "ساعة", count: 8, tone: "violet", icon: "02", image: "/reference-cards/pc-master.jpg" },
  { type: "PC_NORMAL", title: "PC NORMAL", arTitle: "PC عادي", description: "جلسات مريحة وسريعة وممتعة", price: 2500, unit: "ساعة", count: 8, tone: "cyan", icon: "03", image: "/reference-cards/pc-normal.jpg" },
  { type: "CINEMA", title: "CINEMA ROOMS", arTitle: "غرف السينما", description: "شاشة كبيرة وصوت محيطي لتجربة سينمائية", price: 12000, unit: "ساعة", count: 4, tone: "pink", icon: "04", image: "/reference-cards/cinema.jpg" },
  { type: "BILLIARD", title: "BILLIARD", arTitle: "بليارد", description: "طاولات بليارد احترافية وأجواء ممتعة", price: 1000, unit: "ساعة", count: 2, tone: "cyan", icon: "05", image: "/reference-cards/billiard.jpg" },
  { type: "TABLE", title: "TABLES", arTitle: "الطاولات", description: "مساحة مريحة للألعاب والطعام والاسترخاء", price: 5000, unit: "ساعة", count: 8, tone: "violet", icon: "06", image: "/reference-cards/tables.jpg" },
];

export function getService(type: string) {
  return SERVICES.find((service) => service.type === type);
}

export function formatIQD(value: number) {
  return `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}:${String(mins).padStart(2, "0")} ساعة` : `${hours} ساعة`;
}
