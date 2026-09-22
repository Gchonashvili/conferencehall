# Unsplash photo shortlist

Reviewed 2026-09-22 in the browser. Nothing has been downloaded yet. Each photo page was checked to read "Free Photo on Unsplash", not "Unsplash+". Only photos found with the `license=free` filter are listed.

**Eligibility rules used**
- Free Unsplash License only. Unsplash+ (paid) and the sponsored iStock results are excluded.
- Landscape, warm tones, no legible logos, no identifiable faces.
- For atmosphere only. **Never for hall cards, hall galleries or hall share images.**

## Approved (round 1)

| Slot | Photo | Photographer | ID |
|---|---|---|---|
| Hero | [Large auditorium with rows of red seats](https://unsplash.com/photos/a-large-auditorium-with-rows-of-red-seats-GenlGZhrmnM) | Edwin Petrus (@ep_petrus) | `GenlGZhrmnM` |
| Tbilisi tile | [Aerial photo of houses (old town, Narikala)](https://unsplash.com/photos/aerial-photo-of-houses-b-eGDk5_gPo) | Denis Arslanbekov (@arslanbekov) | `b-eGDk5_gPo` |
| Batumi tile | [City skyline under cloudy sky](https://unsplash.com/photos/city-skyline-under-cloudy-sky-during-daytime-R68FdCxFOII) | Max (@baseddesigner) | `R68FdCxFOII` |
| Kutaisi tile | [Bagrati Cathedral, aerial](https://unsplash.com/photos/aerial-photography-of-gray-concrete-building-during-daytime-UtVi_VUXJPk) | Tomáš Malík | `UtVi_VUXJPk` |

## Proposed (round 2)

| Slot | Photo | Photographer | ID | Flags |
|---|---|---|---|---|
| Banner | [Staircase with chandelier](https://unsplash.com/photos/a-staircase-with-a-chandelier-and-a-chandelier-hanging-from-the-ceiling-N3PtXsAdxt8) | William V | `N3PtXsAdxt8` | An interior of some grand building; mood only |
| Conference | [People sitting on chair inside room](https://unsplash.com/photos/people-sitting-on-chair-inside-room-ID1yWa1Wpx0) | Wan San Yip | `ID1yWa1Wpx0` | Audience faces visible but small; extremely widely used |
| Gala | [Long dining table with festive flowers](https://unsplash.com/photos/long-dining-table-with-festive-flowers-fb0_wj2MZk4) | M F (@mfe1) | `fb0_wj2MZk4` | Wine bottle in the middle, label not legible |
| Exhibition | [Blue and black bench on white floor tiles](https://unsplash.com/photos/blue-and-black-bench-on-white-floor-tiles-yGukQe7KY2A) | ASIA CULTURECENTER | `yGukQe7KY2A` | A real, identifiable building (the Asia Culture Center, Korea), posted by the institution itself; cooler tones |
| Meeting | [Oval wooden conference table](https://unsplash.com/photos/oval-brown-wooden-conference-table-and-chairs-inside-conference-room-GWe0dlVD9e0) | Benjamin Child | `GWe0dlVD9e0` | Clean and warm, but over 116M views, so not distinctive |
| Training | **none. Decision: keep the generated illustration** | | | Every corporate-training photo found shows identifiable people. The best one (`gMsnXqILjp4`, Campaign Creators) also shows a Windows screen and an Apple logo. |

## Not eligible
- `edR1yPgm8cs` Old Tbilisi balcony houses: **Unsplash+ (paid)**.
- Anything under "Sponsored images (iStock)".

## Decisions (2026-09-22)
- Training tile keeps the generated illustration.
- Conference (faces visible but small) and exhibition (a real building) accepted as proposed.
- The photos are downloaded by hand, not by script.

## How to add the photos
1. Open each link above and click **Download** (the default size is fine; larger is better).
2. Put all the files in `stock-originals/` in the project root. Keep Unsplash's filenames: `<photographer>-<photo-id>-unsplash.jpg`. The prepare script finds each photo by its id.
3. Run `pnpm photos:prepare`. It resizes to at most 2400px, writes `public/images/stock/`, and warns about low-resolution files.
4. Any slot without a file keeps the illustration, so partial batches are fine.
