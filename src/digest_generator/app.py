import os
import json
import boto3
import urllib.request
from datetime import datetime, timezone

s3 = boto3.client("s3")

BUCKET = os.environ["DIGEST_BUCKET"]
LAT = os.environ["WEATHER_LATITUDE"]
LON = os.environ["WEATHER_LONGITUDE"]
LOCATION_NAME = os.environ["WEATHER_LOCATION_NAME"]

def lambda_handler(event, context):
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={LAT}&longitude={LON}"
        "&current=temperature_2m,wind_speed_10m,weather_code"
    )

    with urllib.request.urlopen(url, timeout=10) as response:
        weather = json.loads(response.read().decode("utf-8"))

    now = datetime.now(timezone.utc)
    archive_key = now.strftime("digests/%Y/%m/%d/%H.json")

    payload = {
        "s3_key": archive_key,
        "data": {
            "generated_at": now.isoformat(),
            "source": "open-meteo",
            "location": LOCATION_NAME,
            "temperature_c": weather["current"]["temperature_2m"],
            "wind_speed": weather["current"]["wind_speed_10m"],
            "weather_code": weather["current"]["weather_code"]
        }
    }

    s3.put_object(
        Bucket=BUCKET,
        Key=archive_key,
        Body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        ContentType="application/json"
    )

    s3.put_object(
        Bucket=BUCKET,
        Key="digests/latest.json",
        Body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        ContentType="application/json"
    )

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "digest saved", "s3_key": archive_key})
    }