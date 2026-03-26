import json
import boto3
import os
import uuid
from datetime import datetime

TABLE_NAME = os.environ.get("TABLE_NAME", "default_table")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

def handler(event, context):
    try:
        request_context = event.get("requestContext", {})
        http_method = request_context.get("httpMethod")
        
        if http_method == "POST":
            body_content = event.get("body")
            if body_content is None:
                body_content = "{}"
                
            body = json.loads(body_content)
            
            item_id = str(uuid.uuid4())
            item = {
                "id": item_id,
                "content": body.get("content", "Default"),
                "created_at": datetime.now().isoformat()
            }
            table.put_item(Item=item)
            return {
                "statusCode": 201,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "Created", "item": item})
            }
            
        elif http_method == "GET":
            response = table.scan()
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"items": response.get("Items", [])})
            }
            
        return {
            "statusCode": 405,
            "body": json.dumps({"message": "Method Not Allowed"})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal Server Error"})
        }
