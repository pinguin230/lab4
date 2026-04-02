import os
import json
import boto3

s3 = boto3.client("s3")
translate = boto3.client("translate")

BUCKET = os.environ["DIGEST_BUCKET"]

# WMO Weather Interpretation Codes (для fallback зі старих дайджестів)
WMO_DESCRIPTIONS = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "rime fog",
    51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
    61: "slight rain", 63: "moderate rain", 65: "heavy rain",
    71: "slight snow", 73: "moderate snow", 75: "heavy snow", 77: "snow grains",
    80: "slight rain showers", 81: "moderate rain showers", 82: "violent rain showers",
    85: "slight snow showers", 86: "heavy snow showers",
    95: "thunderstorm", 96: "thunderstorm with slight hail", 99: "thunderstorm with heavy hail",
}


def lambda_handler(event, context):
    query = event.get("queryStringParameters") or {}
    lang = query.get("lang")

    try:
        # беремо latest digest
        response = s3.get_object(Bucket=BUCKET, Key="digests/latest.json")
        body = json.loads(response["Body"].read().decode("utf-8"))

        if not lang:
            return response_ok(body)

        # Ключ кешу прив'язаний до конкретного дайджесту (за архівним ключем),
        # щоб уникнути повернення застарілого перекладу після оновлення дайджесту
        s3_key = body.get("s3_key", "digests/unknown")
        timestamp_part = s3_key.replace("digests/", "").replace(".json", "")
        cache_key = f"digests/translations/{timestamp_part}/{lang}.json"

        try:
            cached_obj = s3.get_object(Bucket=BUCKET, Key=cache_key)
            cached = json.loads(cached_obj["Body"].read())
            # Пропускаємо застарілий кеш із порожнім перекладом
            if cached.get("translated_summary"):
                return response_ok(cached)
        except s3.exceptions.NoSuchKey:
            pass

        data = body.get("data", {})
        summary = data.get("summary", "")
        weather_description = data.get("weather_description", "")

        # Fallback для старих дайджестів без поля summary
        if not summary:
            weather_description = weather_description or WMO_DESCRIPTIONS.get(
                data.get("weather_code"), ""
            )
            daily_today = data.get("daily_today") or {}
            current_details = data.get("current_details") or {}
            parts = []
            location = data.get("location")
            if location:
                parts.append(f"Weather in {location}:")
            if weather_description:
                parts.append(f"{weather_description.capitalize()}.")
            temp = data.get("temperature_c")
            if temp is not None:
                parts.append(f"Temperature is {temp}\u00b0C.")
            wind = data.get("wind_speed")
            if wind is not None:
                parts.append(f"Wind speed is {wind} m/s.")
            humidity = data.get("humidity_percent")
            if humidity is not None:
                parts.append(f"Humidity: {humidity}%.")
            precipitation = data.get("precipitation_mm")
            if precipitation is not None:
                parts.append(f"Precipitation: {precipitation} mm.")

            temp_min = daily_today.get("temp_min_c")
            temp_max = daily_today.get("temp_max_c")
            if temp_min is not None and temp_max is not None:
                parts.append(f"Today min/max: {temp_min}°C/{temp_max}°C.")

            wind_gusts = current_details.get("wind_gusts_mps")
            if wind_gusts is not None:
                parts.append(f"Wind gusts: {wind_gusts} m/s.")
            summary = " ".join(parts)

        # Перекладаємо лише людиночитаємий текст, а не JSON-ключі
        translated_summary = _translate(summary, lang) if summary else summary
        translated_description = (
            _translate(weather_description, lang) if weather_description else weather_description
        )

        translated = {
            "original": body,
            "translated_summary": translated_summary,
            "translated_description": translated_description,
            "target_lang": lang,
        }

        s3.put_object(
            Bucket=BUCKET,
            Key=cache_key,
            Body=json.dumps(translated, ensure_ascii=False).encode("utf-8"),
            ContentType="application/json",
        )

        return response_ok(translated)

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
        }


def _translate(text, target_lang):
    result = translate.translate_text(
        Text=text,
        SourceLanguageCode="en",
        TargetLanguageCode=target_lang,
    )
    return result["TranslatedText"]


def response_ok(data):
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False),
    }
