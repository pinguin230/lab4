output "api_endpoint" {
  value = module.api_gateway.api_endpoint
}

output "digest_bucket_name" {
  value = module.s3_digest.bucket_name
}