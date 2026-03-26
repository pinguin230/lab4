import os
import json
import boto3

s3 = boto3.client("s3")
BUCKET = os.environ["DIGEST_BUCKET"]

def lambda_handler(event, context):
    try:
        response = s3.get_object(Bucket=BUCKET, Key="digests/latest.json")
        body = response["Body"].read().decode("utf-8")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": body
        }

    except s3.exceptions.NoSuchKey:
        return {
            "statusCode": 404,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({"message": "digest not found"})
        }