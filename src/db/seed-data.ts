import type { I18n } from "./schema";

/**
 * SAMPLE data for development and demos only. All venues are fictional and
 * marked "(sample)". The sample seeder refuses to run in production.
 */
type Area = { name: I18n; theatre?: number; classroom?: number; banquet?: number; reception?: number };
type SampleHall = {
  slug: string;
  name: I18n;
  hallType: "conference_hall" | "ballroom" | "meeting_room" | "auditorium" | "exhibition_hall";
  priceGel: number;
  priceUnit: "hour" | "half_day" | "day";
  min: number;
  max: number;
  featured?: boolean;
  eventTypes: string[];
  amenities: string[];
  areas: Area[];
};
type SampleVenue = {
  slug: string;
  name: I18n;
  city: string;
  address: I18n;
  lat: number;
  lng: number;
  halls: SampleHall[];
};

const n = (en: string, ka: string): I18n => ({ en, ka });

export const SAMPLE_VENUES: SampleVenue[] = [
  {
    slug: "rustaveli-grand-sample",
    name: n("Rustaveli Grand Hotel (sample)", "რუსთაველი გრანდ ჰოტელი (სანიმუშო)"),
    city: "tbilisi",
    address: n("Rustaveli Avenue, Tbilisi", "რუსთაველის გამზირი, თბილისი"),
    lat: 41.7009,
    lng: 44.7997,
    halls: [
      {
        slug: "grand-conference-hall-sample",
        name: n("Grand Conference Hall (sample)", "დიდი საკონფერენციო დარბაზი (სანიმუშო)"),
        hallType: "conference_hall",
        priceGel: 1800,
        priceUnit: "day",
        min: 50,
        max: 400,
        featured: true,
        eventTypes: ["conference", "training", "exhibition"],
        amenities: ["projector", "wifi", "parking", "translation", "air_conditioning", "accessible"],
        areas: [
          { name: n("Main hall", "მთავარი დარბაზი"), theatre: 400, classroom: 220, banquet: 260, reception: 500 },
          { name: n("Boardroom", "სათათბირო ოთახი"), classroom: 24, theatre: 30 },
        ],
      },
      {
        slug: "crystal-ballroom-sample",
        name: n("Crystal Ballroom (sample)", "ბროლის დარბაზი (სანიმუშო)"),
        hallType: "ballroom",
        priceGel: 3200,
        priceUnit: "day",
        min: 100,
        max: 500,
        eventTypes: ["gala", "conference"],
        amenities: ["catering", "stage", "wifi", "air_conditioning"],
        areas: [{ name: n("Ballroom", "საბანკეტო დარბაზი"), banquet: 400, reception: 600, theatre: 450 }],
      },
    ],
  },
  {
    slug: "mtatsminda-business-sample",
    name: n("Mtatsminda Business Center (sample)", "მთაწმინდა ბიზნეს ცენტრი (სანიმუშო)"),
    city: "tbilisi",
    address: n("Chavchavadze Avenue, Tbilisi", "ჭავჭავაძის გამზირი, თბილისი"),
    lat: 41.7086,
    lng: 44.7712,
    halls: [
      {
        slug: "summit-auditorium-sample",
        name: n("Summit Auditorium (sample)", "სამიტის აუდიტორია (სანიმუშო)"),
        hallType: "auditorium",
        priceGel: 1400,
        priceUnit: "day",
        min: 80,
        max: 250,
        eventTypes: ["conference", "training"],
        amenities: ["projector", "video_conferencing", "wifi", "translation", "accessible"],
        areas: [{ name: n("Auditorium", "აუდიტორია"), theatre: 250, classroom: 120 }],
      },
      {
        slug: "training-room-a-sample",
        name: n("Training Room A (sample)", "სასწავლო ოთახი A (სანიმუშო)"),
        hallType: "meeting_room",
        priceGel: 120,
        priceUnit: "hour",
        min: 10,
        max: 30,
        eventTypes: ["training", "meeting"],
        amenities: ["projector", "wifi", "video_conferencing", "natural_light"],
        areas: [{ name: n("Room A", "ოთახი A"), classroom: 24, theatre: 30 }],
      },
    ],
  },
  {
    slug: "black-sea-resort-sample",
    name: n("Black Sea Resort & Spa (sample)", "შავი ზღვის კურორტი (სანიმუშო)"),
    city: "batumi",
    address: n("Batumi Boulevard, Batumi", "ბათუმის ბულვარი, ბათუმი"),
    lat: 41.6503,
    lng: 41.6359,
    halls: [
      {
        slug: "sea-view-conference-hall-sample",
        name: n("Sea View Conference Hall (sample)", "ზღვის ხედის საკონფერენციო დარბაზი (სანიმუშო)"),
        hallType: "conference_hall",
        priceGel: 1500,
        priceUnit: "day",
        min: 40,
        max: 300,
        featured: true,
        eventTypes: ["conference", "training", "meeting"],
        amenities: ["projector", "wifi", "parking", "natural_light", "catering"],
        areas: [{ name: n("Main hall", "მთავარი დარბაზი"), theatre: 300, classroom: 160, banquet: 200, reception: 350 }],
      },
      {
        slug: "grand-ballroom-batumi-sample",
        name: n("Grand Ballroom (sample)", "დიდი საბანკეტო დარბაზი (სანიმუშო)"),
        hallType: "ballroom",
        priceGel: 3800,
        priceUnit: "day",
        min: 100,
        max: 700,
        eventTypes: ["gala", "conference", "exhibition"],
        amenities: ["catering", "stage", "air_conditioning", "parking", "accessible"],
        areas: [{ name: n("Ballroom", "საბანკეტო დარბაზი"), banquet: 550, reception: 800, theatre: 700 }],
      },
    ],
  },
  {
    slug: "batumi-expo-sample",
    name: n("Batumi Expo Center (sample)", "ბათუმის ექსპო ცენტრი (სანიმუშო)"),
    city: "batumi",
    address: n("Gorgiladze Street, Batumi", "გორგილაძის ქუჩა, ბათუმი"),
    lat: 41.6392,
    lng: 41.6217,
    halls: [
      {
        slug: "expo-hall-1-sample",
        name: n("Expo Hall 1 (sample)", "ექსპო დარბაზი 1 (სანიმუშო)"),
        hallType: "exhibition_hall",
        priceGel: 6000,
        priceUnit: "day",
        min: 200,
        max: 1200,
        eventTypes: ["exhibition", "conference"],
        amenities: ["parking", "wifi", "air_conditioning", "accessible", "stage"],
        areas: [{ name: n("Exhibition floor", "საგამოფენო სივრცე"), reception: 1200, theatre: 900 }],
      },
    ],
  },
  {
    slug: "imereti-hotel-sample",
    name: n("Imereti Hotel (sample)", "იმერეთი ჰოტელი (სანიმუშო)"),
    city: "kutaisi",
    address: n("Tamar Mepe Avenue, Kutaisi", "თამარ მეფის გამზირი, ქუთაისი"),
    lat: 42.2679,
    lng: 42.6946,
    halls: [
      {
        slug: "old-town-forum-sample",
        name: n("Old Town Forum (sample)", "ძველი ქალაქის ფორუმი (სანიმუშო)"),
        hallType: "conference_hall",
        priceGel: 900,
        priceUnit: "day",
        min: 30,
        max: 150,
        eventTypes: ["conference", "training", "gala"],
        amenities: ["projector", "wifi", "catering", "parking"],
        areas: [{ name: n("Forum hall", "ფორუმის დარბაზი"), theatre: 150, classroom: 80, banquet: 100 }],
      },
      {
        slug: "meeting-room-lelo-sample",
        name: n("Meeting Room Lelo (sample)", "სათათბირო ოთახი ლელო (სანიმუშო)"),
        hallType: "meeting_room",
        priceGel: 70,
        priceUnit: "hour",
        min: 8,
        max: 20,
        eventTypes: ["meeting", "training"],
        amenities: ["wifi", "video_conferencing", "natural_light"],
        areas: [{ name: n("Room", "ოთახი"), classroom: 16, theatre: 20 }],
      },
    ],
  },
];
