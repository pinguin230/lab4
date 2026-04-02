output "api_endpoint" {
  value = module.api_gateway.api_endpoint
}

output "digest_bucket_name" {
  value = module.s3_digest.bucket_name
}

output "frontend_website_url" {
  value = module.frontend_site.website_url
}

output "frontend_bucket_name" {
  value = module.frontend_site.bucket_name
}