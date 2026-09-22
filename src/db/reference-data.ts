import type { I18n } from "./schema";

type Ref = { slug: string; name: I18n };

export const CITIES: Ref[] = [
  { slug: "tbilisi", name: { ka: "თბილისი", en: "Tbilisi" } },
  { slug: "batumi", name: { ka: "ბათუმი", en: "Batumi" } },
  { slug: "kutaisi", name: { ka: "ქუთაისი", en: "Kutaisi" } },
];

export const EVENT_TYPES: Ref[] = [
  { slug: "conference", name: { ka: "კონფერენცია", en: "Conference" } },
  { slug: "training", name: { ka: "ტრენინგი", en: "Training" } },
  { slug: "gala", name: { ka: "გალა-ვახშამი", en: "Gala dinner" } },
  { slug: "exhibition", name: { ka: "გამოფენა", en: "Exhibition" } },
  { slug: "meeting", name: { ka: "შეხვედრა", en: "Meeting" } },
];

export const AMENITIES: Ref[] = [
  { slug: "projector", name: { ka: "პროექტორი", en: "Projector" } },
  { slug: "wifi", name: { ka: "Wi-Fi", en: "Wi-Fi" } },
  { slug: "parking", name: { ka: "პარკინგი", en: "Parking" } },
  { slug: "catering", name: { ka: "კეტერინგი", en: "Catering" } },
  { slug: "stage", name: { ka: "სცენა", en: "Stage" } },
  { slug: "video_conferencing", name: { ka: "ვიდეოკონფერენცია", en: "Video conferencing" } },
  { slug: "translation", name: { ka: "სინქრონული თარგმანი", en: "Simultaneous translation" } },
  { slug: "air_conditioning", name: { ka: "კონდიცირება", en: "Air conditioning" } },
  { slug: "natural_light", name: { ka: "ბუნებრივი განათება", en: "Natural light" } },
  { slug: "accessible", name: { ka: "ადაპტირებული გარემო", en: "Step-free access" } },
];
