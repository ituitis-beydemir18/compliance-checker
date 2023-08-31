# variables.tf

variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default = "ComplianceCheckerTerraforn"
}

variable "sns_topic_name" {
  description = "NAME of the SNS topic for non-compliance alerts"
  type        = string
  default = "NonComplianceResourceFound"
}

variable "sns_fallback_topic_name" {
  description = "NAME of the SNS topic for non-compliance alerts with unknown creators"
  type        = string
  default = "NonComplianceResourceFoundFallback"
}