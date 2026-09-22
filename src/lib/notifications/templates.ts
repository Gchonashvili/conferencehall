/**
 * Message content for every notification kind, in Georgian and English.
 * WhatsApp business-initiated messages must use pre-approved templates, so
 * each WhatsApp-capable kind also returns a template name + ordered params
 * for the n8n workflow; `text` is the plain-text fallback.
 */
export type Locale = "ka" | "en";
type Payload = Record<string, unknown>;

export type Rendered = {
  subject: string;
  text: string;
  html: string;
  whatsapp?: { template: string; params: string[] };
};

const s = (p: Payload, k: string) => String(p[k] ?? "");
const pick = (locale: string, ka: string, en: string) => (locale === "ka" ? ka : en);

const TIMES: Record<string, { ka: string; en: string }> = {
  morning: { ka: "დილა", en: "Morning" },
  afternoon: { ka: "შუადღე", en: "Afternoon" },
  evening: { ka: "საღამო", en: "Evening" },
  full_day: { ka: "მთელი დღე", en: "Full day" },
};
const timeLabel = (locale: string, v: string) => TIMES[v]?.[locale === "ka" ? "ka" : "en"] ?? v;

export function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function wrapHtml(title: string, text: string): string {
  const body = escapeHtml(text)
    .split("\n")
    .map((l) => (l ? `<p style="margin:0 0 8px">${l.replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#bc4544">$1</a>')}</p>` : "<br>"))
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#fff1ea;padding:24px;font-family:Georgia,serif;color:#4a2f11"><div style="max-width:560px;margin:auto;background:#fffdfe;border-radius:16px;padding:28px"><h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>${body}</div></body></html>`;
}

function make(subject: string, text: string, whatsapp?: Rendered["whatsapp"]): Rendered {
  return { subject, text, html: wrapHtml(subject, text), whatsapp };
}

function requestDetails(p: Payload, locale: string): string {
  return [
    `${pick(locale, "დარბაზი", "Hall")}: ${s(p, "hallName")}`,
    `${pick(locale, "თარიღი", "Date")}: ${s(p, "eventDate")} (${timeLabel(locale, s(p, "timeOfDay"))})`,
    `${pick(locale, "სტუმრები", "Guests")}: ${s(p, "guests")}`,
    `${pick(locale, "ღონისძიება", "Event")}: ${s(p, "eventTypeName") || s(p, "eventType")}`,
  ].join("\n");
}

const RENDERERS: Record<string, (p: Payload, l: string) => Rendered> = {
  // The venue: a new request to answer
  "request.created.venue": (p, l) =>
    make(
      pick(l, `ახალი მოთხოვნა ${s(p, "reference")}: ${s(p, "hallName")}`, `New booking request ${s(p, "reference")}: ${s(p, "hallName")}`),
      [
        pick(l, `ახალი დაჯავშნის მოთხოვნა ${s(p, "reference")}`, `New booking request ${s(p, "reference")}`),
        "",
        requestDetails(p, l),
        `${pick(l, "კონტაქტი", "Contact")}: ${s(p, "contactName")}, ${s(p, "contactPhone")}, ${s(p, "contactEmail")}`,
        s(p, "message") ? `${pick(l, "შეტყობინება", "Message")}: ${s(p, "message")}` : "",
        "",
        `${pick(l, "უპასუხეთ პანელში", "Reply in your dashboard")}: ${s(p, "dashboardUrl")}`,
      ]
        .filter((x, i, a) => x !== "" || a[i - 1] !== "")
        .join("\n"),
      {
        template: "new_booking_request",
        params: [s(p, "venueName"), s(p, "hallName"), s(p, "eventDate"), s(p, "guests"), s(p, "reference")],
      },
    ),

  // The organizer: proof the request went out
  "request.created.organizer": (p, l) =>
    make(
      pick(l, `თქვენი მოთხოვნა გაიგზავნა (${s(p, "reference")})`, `Your request was sent (${s(p, "reference")})`),
      [
        pick(l, `გამარჯობა, ${s(p, "contactName")}!`, `Hello ${s(p, "contactName")},`),
        "",
        pick(
          l,
          "თქვენი მოთხოვნა ობიექტს გავუგზავნეთ. ობიექტი დაადასტურებს ხელმისაწვდომობას, სანამ რაიმეს გადაიხდით.",
          "We sent your request to the venue. It will confirm availability before you pay anything.",
        ),
        "",
        `${pick(l, "მოთხოვნის კოდი", "Reference")}: ${s(p, "reference")}`,
        requestDetails(p, l),
        "",
        `${pick(l, "თვალი ადევნეთ აქ", "Track it here")}: ${s(p, "accountUrl")}`,
      ].join("\n"),
    ),

  // The team: a copy of every request, so nothing goes unseen
  "request.created.ops": (p, l) =>
    make(
      `[Ops] ${pick(l, "ახალი მოთხოვნა", "New request")} ${s(p, "reference")}`,
      [
        `${s(p, "venueName")} / ${s(p, "hallName")}`,
        requestDetails(p, l),
        `${s(p, "contactName")}, ${s(p, "contactPhone")}, ${s(p, "contactEmail")}`,
        s(p, "message"),
      ]
        .filter(Boolean)
        .join("\n"),
    ),

  "request.accepted.organizer": (p, l) =>
    make(
      pick(l, `ობიექტმა დაადასტურა ${s(p, "reference")}`, `The venue confirmed ${s(p, "reference")}`),
      [
        pick(l, `კარგი ამბავი, ${s(p, "contactName")}!`, `Good news, ${s(p, "contactName")}!`),
        "",
        pick(l, "ობიექტმა დაადასტურა თქვენი მოთხოვნა.", "The venue confirmed your request."),
        requestDetails(p, l),
        `${pick(l, "ჯამური ფასი", "Total price")}: ${s(p, "totalGel")}`,
        `${pick(l, "გადასახდელი ავანსი", "Deposit due now")}: ${s(p, "depositGel")}`,
        "",
        `${pick(l, "ავანსის გადასახდელად გახსენით", "Pay the deposit here")}: ${s(p, "accountUrl")}`,
      ].join("\n"),
    ),

  "request.declined.organizer": (p, l) =>
    make(
      pick(l, `მოთხოვნა ${s(p, "reference")} ვერ დადასტურდა`, `Request ${s(p, "reference")} could not be confirmed`),
      [
        pick(l, `გამარჯობა, ${s(p, "contactName")}.`, `Hello ${s(p, "contactName")},`),
        "",
        pick(l, "სამწუხაროდ, ობიექტს ამ თარიღზე ვერ შეუძლია მიღება.", "Unfortunately the venue can't host your event on that date."),
        s(p, "declineReason") ? `${pick(l, "მიზეზი", "Reason")}: ${s(p, "declineReason")}` : "",
        "",
        `${pick(l, "იხილეთ სხვა დარბაზები", "See other halls")}: ${s(p, "searchUrl")}`,
      ]
        .filter((x, i, a) => x !== "" || a[i - 1] !== "")
        .join("\n"),
    ),

  "request.expired.organizer": (p, l) =>
    make(
      pick(l, `მოთხოვნა ${s(p, "reference")} ვადაგასულია`, `Request ${s(p, "reference")} expired`),
      [
        pick(l, `გამარჯობა, ${s(p, "contactName")}.`, `Hello ${s(p, "contactName")},`),
        "",
        pick(
          l,
          "ობიექტმა დროულად ვერ გიპასუხათ. შეგიძლიათ სხვა დარბაზი სცადოთ ან მოგვწეროთ, დაგეხმარებით.",
          "The venue didn't reply in time. You can try another hall, or write to us and we will help.",
        ),
        "",
        `${pick(l, "იხილეთ სხვა დარბაზები", "See other halls")}: ${s(p, "searchUrl")}`,
      ].join("\n"),
    ),

  // Accounts
  "auth.verify_email": (p, l) =>
    make(
      pick(l, "დაადასტურეთ თქვენი ელ-ფოსტა", "Confirm your email address"),
      [
        pick(l, `გამარჯობა, ${s(p, "name")}!`, `Hello ${s(p, "name")},`),
        "",
        pick(l, "ანგარიშის გასააქტიურებლად გახსენით ბმული:", "Open this link to activate your account:"),
        s(p, "url"),
        "",
        pick(l, "თუ თქვენ არ დარეგისტრირებულხართ, უგულებელყავით ეს წერილი.", "If you didn't sign up, you can ignore this email."),
      ].join("\n"),
    ),

  "auth.reset_password": (p, l) =>
    make(
      pick(l, "პაროლის აღდგენა", "Reset your password"),
      [
        pick(l, `გამარჯობა, ${s(p, "name")}!`, `Hello ${s(p, "name")},`),
        "",
        pick(l, "ახალი პაროლის დასაყენებლად გახსენით ბმული:", "Open this link to choose a new password:"),
        s(p, "url"),
        "",
        pick(l, "თუ თქვენ არ მოგითხოვიათ, უგულებელყავით ეს წერილი.", "If you didn't ask for this, you can ignore this email."),
      ].join("\n"),
    ),

  // Contact form, brief and "list your hall" leads
  "inquiry.received.ops": (p) =>
    make(
      `[Ops] ${s(p, "kind")}: ${s(p, "name")}`,
      [
        `${s(p, "name")}, ${s(p, "phone")}, ${s(p, "email")}`,
        s(p, "details"),
        s(p, "message"),
      ]
        .filter(Boolean)
        .join("\n"),
      { template: "new_inquiry", params: [s(p, "kind"), s(p, "name"), s(p, "phone") || s(p, "email")] },
    ),

  "inquiry.received.sender": (p, l) =>
    make(
      pick(l, "მივიღეთ თქვენი შეტყობინება", "We got your message"),
      [
        pick(l, `გამარჯობა, ${s(p, "name")}!`, `Hello ${s(p, "name")},`),
        "",
        pick(l, "მადლობა, რომ მოგვწერეთ. მალე დაგიკავშირდებით.", "Thank you for writing to us. We will get back to you soon."),
      ].join("\n"),
    ),
};

export function renderNotification(kind: string, locale: string, payload: Payload): Rendered {
  const render = RENDERERS[kind];
  if (!render) throw new Error(`No template for notification kind "${kind}"`);
  return render(payload, locale);
}

export const KNOWN_KINDS = Object.keys(RENDERERS);
