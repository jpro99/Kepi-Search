import type { Chain, HotelRecord } from "@/lib/search/types";

/** YYYY-MM-DD in local calendar (no timezone shift for hotel night labels). */
export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Default stay: ~2 weeks out, two nights (tweak anytime in UI). */
export function defaultStayRange(): { checkIn: string; checkOut: string } {
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { checkIn: toIsoDateLocal(start), checkOut: toIsoDateLocal(end) };
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isoToUsSlash(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${m}/${d}/${y}`;
}

function cityQueryFromLabel(cityLabel: string): string {
  return encodeURIComponent(cityLabel.split(",")[0]?.trim() ?? cityLabel);
}

function chainCityLanding(chain: Chain, cityLabel: string): string {
  const cityEnc = cityQueryFromLabel(cityLabel);
  const cc = cityLabel.toLowerCase().includes("united states")
    ? "US"
    : cityLabel.toLowerCase().includes("italy")
      ? "IT"
      : cityLabel.toLowerCase().includes("germany")
        ? "DE"
        : cityLabel.toLowerCase().includes("united kingdom")
          ? "GB"
          : "";
  switch (chain) {
    case "marriott":
      return `https://www.marriott.com/search/findHotels.mi?searchType=InCity&destinationAddress.city=${cityEnc}${cc ? `&destinationAddress.country=${cc}` : ""}`;
    case "hilton":
      return `https://www.hilton.com/en/search/?query=${cityEnc}`;
    case "hyatt":
      // Hyatt's `?term=` search often redirects to a `_404` path (e.g. Como). Map is stable.
      return `https://www.hyatt.com/explore-hotels/map`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(`book hotel ${cityLabel}`)}`;
  }
}

function googleHotelSearch(name: string, cityLabel: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${cityLabel} book`)}`;
}

function withUrlQuery(
  base: string,
  params: Record<string, string>,
): string {
  try {
    const u = new URL(base);
    for (const [k, v] of Object.entries(params)) {
      if (v) u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    return base;
  }
}

function marriottAvailabilityFromOverview(
  overviewUrl: string,
  checkIn: string,
  checkOut: string,
): string | null {
  const m = overviewUrl.match(/\/hotels\/([a-z0-9]{4,12})-/i);
  if (!m) return null;
  const code = m[1]!.toUpperCase();
  const fromDate = isoToUsSlash(checkIn);
  const toDate = isoToUsSlash(checkOut);
  const qs = new URLSearchParams({
    propertyCode: code,
    fromDate,
    toDate,
    numberOfRooms: "1",
    numberOfGuests: "1",
    vsInitialRequest: "true",
  });
  return `https://www.marriott.com/reservation/availabilitySearch.mi?${qs.toString()}`;
}

function hyattCodeFromPropertyUrl(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[a-z0-9]{4,8}$/i.test(last)) return last.toLowerCase();
    return null;
  } catch {
    return null;
  }
}

/**
 * Best-effort booking URL for a stay. Chains change URLs often; we fall back to
 * property overview or a Google search when we cannot build a dated flow.
 */
export function buildStayBookUrl(
  hit: Pick<HotelRecord, "chain" | "name" | "bookUrl" | "lat" | "lng">,
  cityLabel: string,
  checkIn: string,
  checkOut: string,
): string {
  const base = (hit.bookUrl ?? "").trim();
  const datesOk = isIsoDate(checkIn) && isIsoDate(checkOut) && checkOut > checkIn;

  if (!base.startsWith("http")) {
    return chainCityLanding(hit.chain, cityLabel);
  }

  if (!datesOk) {
    return base;
  }

  if (hit.chain === "marriott" && base.includes("marriott.com")) {
    const dated = marriottAvailabilityFromOverview(base, checkIn, checkOut);
    if (dated) return dated;
  }

  if (hit.chain === "hilton" && base.includes("hilton.com")) {
    return withUrlQuery(base, {
      arrivaldate: checkIn,
      departuredate: checkOut,
    });
  }

  if (hit.chain === "hyatt" && base.includes("hyatt.com")) {
    const code = hyattCodeFromPropertyUrl(base);
    if (code) {
      const qs = new URLSearchParams({
        checkin: checkIn,
        checkout: checkOut,
        rooms: "1",
        adults: "1",
      });
      return `https://www.hyatt.com/shop/rooms/${code}?${qs.toString()}`;
    }
  }

  return base;
}

export function propertyOverviewUrl(
  hit: Pick<HotelRecord, "name" | "bookUrl">,
  cityLabel: string,
): string {
  const base = (hit.bookUrl ?? "").trim();
  if (base.startsWith("http")) return base;
  return googleHotelSearch(hit.name, cityLabel);
}

export function metersToMiles(m: number): string {
  if (!Number.isFinite(m) || m < 0) return "—";
  return (m * 0.000621371).toFixed(m >= 1609 ? 0 : 1);
}
