import os
import json
import boto3
import urllib.request
import urllib.error
from datetime import datetime, timezone

s3 = boto3.client("s3")

BUCKET = os.environ["DIGEST_BUCKET"]
LAT = os.environ["WEATHER_LATITUDE"]
LON = os.environ["WEATHER_LONGITUDE"]
LOCATION_NAME = os.environ["WEATHER_LOCATION_NAME"]

# WMO Weather Interpretation Codes
WMO_DESCRIPTIONS = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    71: "slight snow",
    73: "moderate snow",
    75: "heavy snow",
    77: "snow grains",
    80: "slight rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    85: "slight snow showers",
    86: "heavy snow showers",
    95: "thunderstorm",
    96: "thunderstorm with slight hail",
    99: "thunderstorm with heavy hail",
}


def _first_or_none(values):
    if isinstance(values, list) and values:
        return values[0]
    return None


def _next_hourly_items(hourly, max_items=6):
    times = hourly.get("time") or []
    probs = hourly.get("precipitation_probability") or []
    visibility = hourly.get("visibility") or []

    count = min(len(times), len(probs), len(visibility), max_items)
    items = []
    for idx in range(count):
        items.append(
            {
                "time": times[idx],
                "precip_probability_percent": probs[idx],
                "visibility_m": visibility[idx],
            }
        )
    return items


def lambda_handler(event, context):
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={LAT}&longitude={LON}"
        "&timezone=auto"
        "&forecast_days=1"
        "&current=temperature_2m,apparent_temperature,wind_speed_10m,"
        "wind_direction_10m,wind_gusts_10m,weather_code,relative_humidity_2m,"
        "precipitation,pressure_msl,cloud_cover,is_day"
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
        "precipitation_probability_max,sunrise,sunset,uv_index_max"
        "&hourly=precipitation_probability,visibility"
    )

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            weather = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        return {
            "statusCode": 502,
            "body": json.dumps({"error": f"weather provider error: {str(exc)}"}),
        }

    now = datetime.now(timezone.utc)
    archive_key = now.strftime("digests/%Y/%m/%d/%H.json")

    current = weather.get("current", {})
    daily = weather.get("daily", {})
    hourly = weather.get("hourly", {})

    weather_code = current.get("weather_code")
    weather_description = WMO_DESCRIPTIONS.get(weather_code, f"weather code {weather_code}")
    temp = current.get("temperature_2m")
    feels_like = current.get("apparent_temperature")
    wind_speed = current.get("wind_speed_10m")
    humidity = current.get("relative_humidity_2m")
    precipitation = current.get("precipitation")

    daily_today = {
        "temp_max_c": _first_or_none(daily.get("temperature_2m_max")),
        "temp_min_c": _first_or_none(daily.get("temperature_2m_min")),
        "precipitation_sum_mm": _first_or_none(daily.get("precipitation_sum")),
        "precip_probability_max_percent": _first_or_none(daily.get("precipitation_probability_max")),
        "sunrise": _first_or_none(daily.get("sunrise")),
        "sunset": _first_or_none(daily.get("sunset")),
        "uv_index_max": _first_or_none(daily.get("uv_index_max")),
    }

    summary = (
        f"Weather in {LOCATION_NAME} as of {now.strftime('%Y-%m-%d %H:%M UTC')}: "
        f"{weather_description.capitalize()}. "
        f"Temperature is {temp}°C (feels like {feels_like}°C). "
        f"Wind speed is {wind_speed} m/s. "
        f"Humidity: {humidity}%. "
        f"Precipitation: {precipitation} mm. "
        f"Today min/max: {daily_today['temp_min_c']}°C/{daily_today['temp_max_c']}°C."
    )

    payload = {
        "s3_key": archive_key,
        "data": {
            "generated_at": now.isoformat(),
            "source": "open-meteo",
            "location": LOCATION_NAME,
            "temperature_c": temp,
            "feels_like_c": feels_like,
            "wind_speed": wind_speed,
            "weather_code": weather_code,
            "weather_description": weather_description,
            "humidity_percent": humidity,
            "precipitation_mm": precipitation,
            "current_details": {
                "wind_direction_deg": current.get("wind_direction_10m"),
                "wind_gusts_mps": current.get("wind_gusts_10m"),
                "pressure_msl_hpa": current.get("pressure_msl"),
                "cloud_cover_percent": current.get("cloud_cover"),
                "is_day": current.get("is_day"),
            },
            "daily_today": daily_today,
            "units": {
                "temperature": "celsius",
                "wind_speed": "m/s",
                "precipitation": "mm",
                "pressure": "hPa",
                "visibility": "m",
            },
            "meta": {
                "requested_fields": {
                    "current": [
                        "temperature_2m",
                        "apparent_temperature",
                        "wind_speed_10m",
                        "wind_direction_10m",
                        "wind_gusts_10m",
                        "weather_code",
                        "relative_humidity_2m",
                        "precipitation",
                        "pressure_msl",
                        "cloud_cover",
                        "is_day",
                    ],
                    "daily": [
                        "temperature_2m_max",
                        "temperature_2m_min",
                        "precipitation_sum",
                        "precipitation_probability_max",
                        "sunrise",
                        "sunset",
                        "uv_index_max",
                    ],
                    "hourly": ["time", "precipitation_probability", "visibility"],
                }
            },
            "summary": summary,
        },
    }

    for key in (archive_key, "digests/latest.json"):
        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            ContentType="application/json",
        )

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "digest saved", "s3_key": archive_key}),
    }
