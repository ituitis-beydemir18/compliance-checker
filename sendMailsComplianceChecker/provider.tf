provider "aws" {
  region = var.region
  access_key = ""
  secret_key = ""
  token = ""
}

data "aws_caller_identity" "current" {}
