variable "function_name" { type = string }
variable "source_dir" { type = string }
variable "handler" { type = string }
variable "runtime" { type = string }
variable "timeout" { type = number }
variable "memory_size" { type = number }

variable "environment_vars" {
  type    = map(string)
  default = {}
}

variable "s3_bucket_arn" {
  type = string
}