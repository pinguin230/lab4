variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "project_name" {
  type    = string
  default = "serverless-digest"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "weather_latitude" {
  type    = string
  default = "49.84"
}

variable "weather_longitude" {
  type    = string
  default = "24.03"
}

variable "weather_location_name" {
  type    = string
  default = "Lviv"
}