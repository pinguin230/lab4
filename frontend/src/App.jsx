import { Fragment, useCallback, useMemo, useState } from "react";
import "./App.css";

// AWS Translate supported languages — comprehensive list
const ALL_LANGUAGES = [
  { label: "Оригінал", value: "" },
  // Popular
  { label: "English", value: "en" },
  { label: "Українська", value: "uk" },
  { label: "Polski", value: "pl" },
  { label: "Deutsch", value: "de" },
  { label: "Français", value: "fr" },
  { label: "Español", value: "es" },
  { label: "Italiano", value: "it" },
  { label: "Português", value: "pt" },
  { label: "中文 (简体)", value: "zh" },
  { label: "中文 (繁體)", value: "zh-TW" },
  { label: "日本語", value: "ja" },
  { label: "한국어", value: "ko" },
  { label: "العربية", value: "ar" },
  { label: "हिन्दी", value: "hi" },
  // European
  { label: "Čeština", value: "cs" },
  { label: "Magyar", value: "hu" },
  { label: "Română", value: "ro" },
  { label: "Slovenčina", value: "sk" },
  { label: "Slovenščina", value: "sl" },
  { label: "Hrvatski", value: "hr" },
  { label: "Српски", value: "sr" },
  { label: "Български", value: "bg" },
  { label: "Македонски", value: "mk" },
  { label: "Dansk", value: "da" },
  { label: "Svenska", value: "sv" },
  { label: "Norsk", value: "no" },
  { label: "Suomi", value: "fi" },
  { label: "Nederlands", value: "nl" },
  { label: "Ελληνικά", value: "el" },
  { label: "Català", value: "ca" },
  { label: "Eesti", value: "et" },
  { label: "Latviešu", value: "lv" },
  { label: "Lietuvių", value: "lt" },
  { label: "Íslenska", value: "is" },
  { label: "Shqip", value: "sq" },
  { label: "Bosanski", value: "bs" },
  { label: "Malti", value: "mt" },
  { label: "Cymraeg", value: "cy" },
  { label: "Français (Canada)", value: "fr-CA" },
  { label: "Español (México)", value: "es-MX" },
  { label: "Português (Portugal)", value: "pt-PT" },
  // Asian / Middle East
  { label: "Türkçe", value: "tr" },
  { label: "Bahasa Indonesia", value: "id" },
  { label: "Bahasa Melayu", value: "ms" },
  { label: "Filipino (Tagalog)", value: "tl" },
  { label: "ภาษาไทย", value: "th" },
  { label: "Tiếng Việt", value: "vi" },
  { label: "বাংলা", value: "bn" },
  { label: "اردو", value: "ur" },
  { label: "فارسی", value: "fa" },
  { label: "Dari", value: "fa-AF" },
  { label: "Pashto", value: "ps" },
  { label: "Հայերեն", value: "hy" },
  { label: "ქართული", value: "ka" },
  { label: "Қазақша", value: "kk" },
  { label: "Монгол", value: "mn" },
  { label: "O'zbek", value: "uz" },
  { label: "Azərbaycan", value: "az" },
  { label: "עברית", value: "he" },
  { label: "ગુજરાતી", value: "gu" },
  { label: "ਪੰਜਾਬੀ", value: "pa" },
  { label: "मराठी", value: "mr" },
  { label: "ಕನ್ನಡ", value: "kn" },
  { label: "മലയാളം", value: "ml" },
  { label: "தமிழ்", value: "ta" },
  { label: "తెలుగు", value: "te" },
  { label: "සිංහල", value: "si" },
  // African / other
  { label: "Afrikaans", value: "af" },
  { label: "Hausa", value: "ha" },
  { label: "Somali", value: "so" },
  { label: "Kiswahili", value: "sw" },
  { label: "Amharic", value: "am" },
  { label: "Haitian Creole", value: "ht" },
];

const WMO_DESCRIPTIONS = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
  45: "fog", 48: "rime fog",
  51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
  61: "slight rain", 63: "moderate rain", 65: "heavy rain",
  71: "slight snow", 73: "moderate snow", 75: "heavy snow", 77: "snow grains",
  80: "slight rain showers", 81: "moderate rain showers", 82: "violent rain showers",
  95: "thunderstorm", 96: "thunderstorm with slight hail", 99: "thunderstorm with heavy hail",
};

const WMO_EMOJI = (code) => {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "❄️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
};

function relativeTime(isoString) {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "щойно";
  if (mins < 60) return `${mins} хв тому`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} год тому`;
  return new Date(isoString).toLocaleDateString("uk-UA");
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function trimBase(url) {
  return url.trim().replace(/\/$/, "");
}

function normalizeLanguageToken(value = "") {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function App() {
  const [apiBase, setApiBase] = useState(
    "https://shcrfzzp9a.execute-api.eu-central-1.amazonaws.com"
  );
  const [lang, setLang] = useState("");
  const [langSearch, setLangSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [copied, setCopied] = useState(false);

  const selectedLanguage = useMemo(
    () => ALL_LANGUAGES.find((item) => item.value === lang) ?? null,
    [lang]
  );

  const filteredLanguages = useMemo(() => {
    const q = normalizeLanguageToken(langSearch);
    if (!q) return ALL_LANGUAGES;
    return ALL_LANGUAGES.filter(
      (item) =>
        normalizeLanguageToken(item.label).includes(q) ||
        normalizeLanguageToken(item.value).includes(q)
    );
  }, [langSearch]);

  const selectOptions = useMemo(() => {
    if (!selectedLanguage) return filteredLanguages;
    if (filteredLanguages.some((item) => item.value === selectedLanguage.value)) {
      return filteredLanguages;
    }
    // Keep selected language in the list so controlled <select> never enters an invalid state.
    return [selectedLanguage, ...filteredLanguages];
  }, [filteredLanguages, selectedLanguage]);

  const noLanguageMatches = filteredLanguages.length === 0;

  const requestUrl = useMemo(() => {
    const base = trimBase(apiBase);
    if (!base) return "";
    const safeLang = selectedLanguage?.value ?? "";
    return safeLang
      ? `${base}/digest/latest?lang=${encodeURIComponent(safeLang)}`
      : `${base}/digest/latest`;
  }, [apiBase, selectedLanguage]);

  const handleFetch = async () => {
    if (!requestUrl) {
      setError("Вкажи API URL");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(requestUrl);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      }
      setPayload(data);
    } catch (err) {
      setPayload(null);
      setError(err.message || "Помилка запиту");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — just ignore
    }
  }, []);

  const digest = payload?.data ?? payload?.original?.data ?? null;
  const s3Key = payload?.s3_key ?? payload?.original?.s3_key ?? "—";
  const translatedSummary = payload?.translated_summary ?? "";
  const translatedDescription = payload?.translated_description ?? "";
  const targetLang = payload?.target_lang ?? "";
  const currentDetails = digest?.current_details ?? {};
  const dailyToday = digest?.daily_today ?? {};

  // Fallback для старих дайджестів без поля summary / weather_description
  const displayDescription =
    digest?.weather_description ||
    (digest?.weather_code != null ? WMO_DESCRIPTIONS[digest.weather_code] : "") ||
    "";

  const displaySummary = digest?.summary || (() => {
    if (!digest) return "";
    const parts = [];
    if (digest.location) parts.push(`Weather in ${digest.location}:`);
    if (displayDescription) parts.push(`${displayDescription.charAt(0).toUpperCase() + displayDescription.slice(1)}.`);
    if (digest.temperature_c != null) parts.push(`Temperature is ${digest.temperature_c}°C.`);
    if (digest.wind_speed != null) parts.push(`Wind speed is ${digest.wind_speed} m/s.`);
    return parts.join(" ");
  })();

  const selectedLangLabel = selectedLanguage?.label ?? "Оригінал";

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <div>
            <h1>Weather Digest Dashboard</h1>
            <p className="subtitle">
              Отримання погодного дайджесту та переклад через AWS Translate.
              Доступно {ALL_LANGUAGES.length - 1} мов.
            </p>
          </div>
          {digest && (
            <div className="freshness">
              <span className="freshness-dot" />
              Оновлено {relativeTime(digest.generated_at)}
            </div>
          )}
        </header>

        {/* Control card */}
        <div className="card">
          <label>API base URL</label>
          <input
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://your-api-id.execute-api.eu-central-1.amazonaws.com"
          />

          <label>Мова перекладу</label>
          <div className="lang-selector">
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
              }}
            >
              {selectOptions.map((item) => (
                <option key={item.value || "original"} value={item.value}>
                  {item.label}
                </option>
              ))}
              {!lang && noLanguageMatches && (
                <option disabled>Мову не знайдено</option>
              )}
            </select>
            {noLanguageMatches && (
              <span className="lang-no-results">Нічого не знайдено за цим запитом</span>
            )}
            {lang && (
              <span className="lang-badge">{selectedLangLabel} ({lang})</span>
            )}
          </div>

          <div className="actions">
            <button onClick={handleFetch} disabled={loading}>
              {loading ? "Завантаження…" : "Отримати"}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setPayload(null);
                setError("");
              }}
            >
              Очистити
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {digest && (
          <>
            {/* Summary card */}
            <div className="card summary-card">
              <div className="summary-icon">{WMO_EMOJI(digest.weather_code)}</div>
              <div className="summary-body">
                <div className="summary-location">{digest.location}</div>
                <div className="summary-text">{displaySummary}</div>
                {displayDescription && (
                  <span className="weather-badge">{displayDescription}</span>
                )}
              </div>
            </div>

            {/* Translation card */}
            {translatedSummary && (
              <div className="card translation-card">
                <div className="translation-header">
                  <h3>Переклад ({targetLang})</h3>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(translatedSummary)}
                  >
                    {copied ? "Скопійовано!" : "Копіювати"}
                  </button>
                </div>
                {translatedDescription && (
                  <span className="weather-badge translated-badge">
                    {translatedDescription}
                  </span>
                )}
                <div className="translation-text">{translatedSummary}</div>
              </div>
            )}

            {/* Details grid */}
            <div className="grid">
              <div className="card">
                <h2>Деталі дайджесту</h2>
                <div className="detail-grid">
                  <span className="detail-label">Місто</span>
                  <span>{digest.location ?? "—"}</span>

                  <span className="detail-label">Температура</span>
                  <span className="detail-value-highlight">
                    {digest.temperature_c != null ? `${digest.temperature_c}°C` : "—"}
                  </span>

                  <span className="detail-label">Відчувається як</span>
                  <span>
                    {digest.feels_like_c != null ? `${digest.feels_like_c}°C` : "—"}
                  </span>

                  <span className="detail-label">Швидкість вітру</span>
                  <span>
                    {digest.wind_speed != null ? `${digest.wind_speed} м/с` : "—"}
                  </span>

                  <span className="detail-label">Опади</span>
                  <span>
                    {digest.precipitation_mm != null ? `${digest.precipitation_mm} мм` : "—"}
                  </span>

                  <span className="detail-label">Вологість</span>
                  <span>
                    {digest.humidity_percent != null ? `${digest.humidity_percent}%` : "—"}
                  </span>

                  <span className="detail-label">Пориви вітру</span>
                  <span>
                    {currentDetails.wind_gusts_mps != null
                      ? `${currentDetails.wind_gusts_mps} м/с`
                      : "—"}
                  </span>

                  <span className="detail-label">Напрям вітру</span>
                  <span>
                    {currentDetails.wind_direction_deg != null
                      ? `${currentDetails.wind_direction_deg}°`
                      : "—"}
                  </span>

                  <span className="detail-label">Тиск (MSL)</span>
                  <span>
                    {currentDetails.pressure_msl_hpa != null
                      ? `${currentDetails.pressure_msl_hpa} hPa`
                      : "—"}
                  </span>

                  <span className="detail-label">Хмарність</span>
                  <span>
                    {currentDetails.cloud_cover_percent != null
                      ? `${currentDetails.cloud_cover_percent}%`
                      : "—"}
                  </span>

                  <span className="detail-label">Мін/макс сьогодні</span>
                  <span>
                    {dailyToday.temp_min_c != null && dailyToday.temp_max_c != null
                      ? `${dailyToday.temp_min_c}°C / ${dailyToday.temp_max_c}°C`
                      : "—"}
                  </span>

                  <span className="detail-label">Ймовірність опадів (макс)</span>
                  <span>
                    {dailyToday.precip_probability_max_percent != null
                      ? `${dailyToday.precip_probability_max_percent}%`
                      : "—"}
                  </span>

                  <span className="detail-label">UV Index (макс)</span>
                  <span>{dailyToday.uv_index_max ?? "—"}</span>

                  <span className="detail-label">Погодний код</span>
                  <span>{digest.weather_code ?? "—"}</span>

                  <span className="detail-label">Оновлено</span>
                  <span className="detail-meta">
                    {digest.generated_at
                      ? new Date(digest.generated_at).toLocaleString("uk-UA")
                      : "—"}
                  </span>

                  <span className="detail-label">S3 ключ</span>
                  <span className="detail-meta">{s3Key}</span>
                </div>
              </div>
              <div className="card">
                <h2>Raw JSON</h2>
                <pre>{prettyJson(payload)}</pre>
              </div>
            </div>
          </>
        )}

        {!digest && !error && (
          <div className="empty-state">
            Натисни «Отримати», щоб завантажити дайджест
          </div>
        )}
      </div>
    </div>
  );
}
