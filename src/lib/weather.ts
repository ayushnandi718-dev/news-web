import { cacheWrap } from "./cache";
import { logApiAlert, updateApiHealth } from "./monitoring";

export type WeatherNow = {
  location: string;
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKmh: number;
  conditionMain: string;
  conditionText: string;
  iconCode: string;
  updatedAt: string;
  source: "openweathermap" | "open-meteo";
};

export type DistrictSpec = {
  slug: string;
  name: string;
  division: string;
  lat: number;
  lon: number;
};

export type DistrictWeather = {
  slug: string;
  district: string;
  division: string;
  weather: WeatherNow | null;
  stale: boolean;
  error: string | null;
};

export const DIVISION_ORDER = [
  "Presidency",
  "Bardhaman",
  "Medinipur",
  "Malda",
  "Jalpaiguri",
] as const;

export const WB_DISTRICTS: DistrictSpec[] = [
  { slug: "alipurduar", name: "Alipurduar", division: "Jalpaiguri", lat: 26.4922, lon: 89.5326 },
  { slug: "bankura", name: "Bankura", division: "Bardhaman", lat: 23.2324, lon: 87.0756 },
  { slug: "birbhum", name: "Birbhum", division: "Bardhaman", lat: 23.9088, lon: 87.527 },
  { slug: "cooch-behar", name: "Cooch Behar", division: "Jalpaiguri", lat: 26.3224, lon: 89.4497 },
  { slug: "dakshin-dinajpur", name: "Dakshin Dinajpur", division: "Malda", lat: 25.221, lon: 88.7596 },
  { slug: "darjeeling", name: "Darjeeling", division: "Jalpaiguri", lat: 27.041, lon: 88.2663 },
  { slug: "hooghly", name: "Hooghly", division: "Presidency", lat: 22.9007, lon: 88.3902 },
  { slug: "howrah", name: "Howrah", division: "Presidency", lat: 22.5958, lon: 88.2636 },
  { slug: "jalpaiguri", name: "Jalpaiguri", division: "Jalpaiguri", lat: 26.5215, lon: 88.7195 },
  { slug: "jhargram", name: "Jhargram", division: "Medinipur", lat: 22.4549, lon: 86.9937 },
  { slug: "kalimpong", name: "Kalimpong", division: "Jalpaiguri", lat: 27.06, lon: 88.4628 },
  { slug: "kolkata", name: "Kolkata", division: "Presidency", lat: 22.5726, lon: 88.3639 },
  { slug: "malda", name: "Malda", division: "Malda", lat: 25.0119, lon: 88.1433 },
  { slug: "murshidabad", name: "Murshidabad", division: "Malda", lat: 24.0982, lon: 88.2679 },
  { slug: "nadia", name: "Nadia", division: "Presidency", lat: 23.4013, lon: 88.5019 },
  { slug: "north-24-parganas", name: "North 24 Parganas", division: "Presidency", lat: 22.7234, lon: 88.4807 },
  { slug: "paschim-bardhaman", name: "Paschim Bardhaman", division: "Bardhaman", lat: 23.5204, lon: 87.3119 },
  { slug: "paschim-medinipur", name: "Paschim Medinipur", division: "Medinipur", lat: 22.4208, lon: 87.3219 },
  { slug: "purba-bardhaman", name: "Purba Bardhaman", division: "Bardhaman", lat: 23.2324, lon: 87.8615 },
  { slug: "purba-medinipur", name: "Purba Medinipur", division: "Medinipur", lat: 22.3007, lon: 87.9243 },
  { slug: "purulia", name: "Purulia", division: "Bardhaman", lat: 23.3321, lon: 86.3652 },
  { slug: "south-24-parganas", name: "South 24 Parganas", division: "Presidency", lat: 22.53, lon: 88.33 },
  { slug: "uttar-dinajpur", name: "Uttar Dinajpur", division: "Malda", lat: 25.6207, lon: 88.1233 },
];

const globalForWeather = globalThis as unknown as {
  weatherLastGood?: Map<string, WeatherNow>;
};

export function weatherTtlSeconds(): number {
  const raw = parseInt(process.env.WEATHER_TTL_SECONDS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? Math.max(600, raw) : 3600;
}

interface OwmResponse {
  name?: string;
  dt?: number;
  main?: { temp?: number; feels_like?: number; humidity?: number };
  wind?: { speed?: number };
  weather?: Array<{ main?: string; description?: string; icon?: string }>;
}

function normalize(json: OwmResponse, spec: DistrictSpec): WeatherNow {
  const temp = json.main?.temp;
  if (typeof temp !== "number") throw new Error("Weather payload missing temperature");
  const feelsLike = json.main?.feels_like;
  const humidity = json.main?.humidity;
  const windSpeed = json.wind?.speed;
  return {
    location: spec.name,
    tempC: Math.round(temp * 10) / 10,
    feelsLikeC: typeof feelsLike === "number" ? Math.round(feelsLike * 10) / 10 : Math.round(temp * 10) / 10,
    humidityPct: typeof humidity === "number" ? Math.round(humidity) : 0,
    windKmh: typeof windSpeed === "number" ? Math.round(windSpeed * 36) / 10 : 0,
    conditionMain: json.weather?.[0]?.main ?? "—",
    conditionText: json.weather?.[0]?.description ?? "",
    iconCode: json.weather?.[0]?.icon ?? "",
    updatedAt: new Date(typeof json.dt === "number" ? json.dt * 1000 : Date.now()).toISOString(),
    source: "openweathermap",
  };
}

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
}

const WMO_CONDITIONS: Record<number, { text: string; iconCode: string }> = {
  0: { text: "clear sky", iconCode: "01d" },
  1: { text: "mainly clear", iconCode: "02d" },
  2: { text: "partly cloudy", iconCode: "03" },
  3: { text: "overcast", iconCode: "04" },
  45: { text: "fog", iconCode: "50" },
  48: { text: "freezing fog", iconCode: "50" },
  51: { text: "light drizzle", iconCode: "09" },
  53: { text: "drizzle", iconCode: "09" },
  55: { text: "heavy drizzle", iconCode: "09" },
  61: { text: "light rain", iconCode: "10" },
  63: { text: "rain", iconCode: "10" },
  65: { text: "heavy rain", iconCode: "10" },
  71: { text: "light snow", iconCode: "13" },
  73: { text: "snow", iconCode: "13" },
  75: { text: "heavy snow", iconCode: "13" },
  80: { text: "rain showers", iconCode: "10" },
  81: { text: "rain showers", iconCode: "10" },
  82: { text: "violent showers", iconCode: "11" },
  95: { text: "thunderstorm", iconCode: "11" },
  96: { text: "thunderstorm, hail", iconCode: "11" },
  99: { text: "thunderstorm, hail", iconCode: "11" },
};

function normalizeOpenMeteo(json: OpenMeteoResponse, spec: DistrictSpec): WeatherNow {
  const current = json.current;
  const temp = current?.temperature_2m;
  if (typeof temp !== "number") throw new Error("Backup weather payload missing temperature");
  const condition = WMO_CONDITIONS[current?.weather_code ?? -1] ?? { text: "—", iconCode: "" };
  const feelsLike = current?.apparent_temperature;
  const humidity = current?.relative_humidity_2m;
  const windSpeed = current?.wind_speed_10m;
  return {
    location: spec.name,
    tempC: Math.round(temp * 10) / 10,
    feelsLikeC: typeof feelsLike === "number" ? Math.round(feelsLike * 10) / 10 : Math.round(temp * 10) / 10,
    humidityPct: typeof humidity === "number" ? Math.round(humidity) : 0,
    windKmh: typeof windSpeed === "number" ? Math.round(windSpeed * 10) / 10 : 0,
    conditionMain: condition.text,
    conditionText: condition.text,
    iconCode: condition.iconCode,
    updatedAt: new Date().toISOString(),
    source: "open-meteo",
  };
}

async function fetchOwm(apiKey: string, spec: DistrictSpec): Promise<WeatherNow> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${spec.lat}&lon=${spec.lon}&units=metric&appid=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) {
      const detail =
        res.status === 401
          ? "Weather API key invalid or not yet active."
          : `Weather provider returned ${res.status}.`;
      updateApiHealth("openweathermap", false);
      logApiAlert("openweathermap", res.status === 401 ? "critical" : "error", detail, {
        district: spec.name,
        status: res.status,
      });
      throw new Error(detail);
    }
    updateApiHealth("openweathermap", true);
    return normalize((await res.json()) as OwmResponse, spec);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenMeteo(spec: DistrictSpec): Promise<WeatherNow> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${spec.lat}&longitude=${spec.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Asia%2FKolkata`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) {
      updateApiHealth("open-meteo", false);
      logApiAlert("open-meteo", "error", `Backup weather provider returned ${res.status}`, {
        district: spec.name,
      });
      throw new Error(`Backup weather provider returned ${res.status}.`);
    }
    updateApiHealth("open-meteo", true);
    return normalizeOpenMeteo((await res.json()) as OpenMeteoResponse, spec);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Current weather for one West Bengal district.
 * - Primary: OpenWeatherMap; automatic failover to Open-Meteo (keyless) when
 *   the primary fails or its daily quota is exhausted.
 * - Cached per district for weatherTtlSeconds (default 3600s, keeps the free
 *   tier's ~1000 calls/day budget: 24 refreshes x 23 districts = 552).
 * - On total failure the last good reading is returned with stale=true.
 * - Never throws; callers render honest error/stale states.
 */
export async function getDistrictWeather(slug: string): Promise<DistrictWeather> {
  const spec = WB_DISTRICTS.find((d) => d.slug === slug);
  if (!spec) {
    return { slug, district: slug, division: "", weather: null, stale: true, error: "Unknown district." };
  }

  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  if (!apiKey) {
    return { slug, district: spec.name, division: spec.division, weather: null, stale: false, error: "Weather service not configured." };
  }

  const ttl = weatherTtlSeconds();
  const bucket = Math.floor(Date.now() / (ttl * 1000));
  const lastGood = (globalForWeather.weatherLastGood ??= new Map<string, WeatherNow>());

  try {
    return await cacheWrap(`weather:v2:${slug}:${bucket}`, ttl, ["weather"], async (): Promise<DistrictWeather> => {
      let primaryError: unknown = null;
      try {
        const weather = await fetchOwm(apiKey, spec);
        lastGood.set(slug, weather);
        return { slug, district: spec.name, division: spec.division, weather, stale: false, error: null };
      } catch (err) {
        primaryError = err;
      }
      try {
        const weather = await fetchOpenMeteo(spec);
        lastGood.set(slug, weather);
        return { slug, district: spec.name, division: spec.division, weather, stale: false, error: null };
      } catch (fallbackError) {
        const detail =
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unable to fetch weather.";
        const last = lastGood.get(slug);
        if (last) return { slug, district: spec.name, division: spec.division, weather: { ...last }, stale: true, error: detail };
        void primaryError;
        return { slug, district: spec.name, division: spec.division, weather: null, stale: true, error: detail };
      }
    });
  } catch {
    const last = lastGood.get(slug);
    if (last) return { slug, district: spec.name, division: spec.division, weather: { ...last }, stale: true, error: "Unable to refresh weather." };
    return { slug, district: spec.name, division: spec.division, weather: null, stale: true, error: "Weather unavailable." };
  }
}

export async function getAllDistrictsWeather(): Promise<DistrictWeather[]> {
  const settled = await Promise.allSettled(WB_DISTRICTS.map((d) => getDistrictWeather(d.slug)));
  return settled.map((result, i) => {
    const spec = WB_DISTRICTS[i];
    if (result.status === "fulfilled") return result.value;
    return { slug: spec.slug, district: spec.name, division: spec.division, weather: null, stale: true, error: "Weather unavailable." };
  });
}

const ICON_EMOJI: Record<string, string> = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "🌤️",
  "02n": "☁️",
  "03": "⛅",
  "04": "☁️",
  "09": "🌧️",
  "10": "🌦️",
  "11": "⛈️",
  "13": "❄️",
  "50": "🌫️",
};

export function iconFor(code: string): string {
  return ICON_EMOJI[code] ?? ICON_EMOJI[code.slice(0, 2)] ?? "🌡️";
}
