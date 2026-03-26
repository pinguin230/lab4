locals {
  prefix = "${var.project_name}-${var.environment}"
}

module "s3_digest" {
  source      = "../../modules/s3"
  bucket_name = "${local.prefix}-digest-bucket"
}

module "lambda_generator" {
  source            = "../../modules/lambda"
  function_name     = "${local.prefix}-digest-generator"
  source_dir        = "../../src/digest_generator"
  handler           = "app.lambda_handler"
  runtime           = "python3.12"
  timeout           = 30
  memory_size       = 256
  environment_vars = {
    DIGEST_BUCKET      = module.s3_digest.bucket_name
    WEATHER_LATITUDE   = var.weather_latitude
    WEATHER_LONGITUDE  = var.weather_longitude
    WEATHER_LOCATION_NAME = var.weather_location_name
  }
  s3_bucket_arn = module.s3_digest.bucket_arn
}

module "lambda_reader" {
  source            = "../../modules/lambda"
  function_name     = "${local.prefix}-digest-reader"
  source_dir        = "../../src/digest_reader"
  handler           = "app.lambda_handler"
  runtime           = "python3.12"
  timeout           = 15
  memory_size       = 256
  environment_vars = {
    DIGEST_BUCKET = module.s3_digest.bucket_name
  }
  s3_bucket_arn = module.s3_digest.bucket_arn
}

module "api_gateway" {
  source              = "../../modules/api_gateway"
  api_name            = "${local.prefix}-api"
  route_key           = "GET /digest/latest"
  lambda_invoke_arn   = module.lambda_reader.invoke_arn
  lambda_function_arn = module.lambda_reader.function_arn
  lambda_function_name = module.lambda_reader.function_name
}

module "scheduler" {
  source                = "../../modules/eventbridge_scheduler"
  schedule_name         = "${local.prefix}-hourly-digest"
  schedule_expression   = "rate(1 hour)"
  target_lambda_arn     = module.lambda_generator.function_arn
  target_lambda_name    = module.lambda_generator.function_name
}