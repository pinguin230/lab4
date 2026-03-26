terraform {
  backend "s3" {
    bucket         = "tf-state-lab4-teslia-mykola-20"
    key            = "serverless-lab4/dev/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
  }
}