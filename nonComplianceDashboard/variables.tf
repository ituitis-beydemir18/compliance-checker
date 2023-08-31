# variables.tf

variable "region" {
    description = "AWS region"
    type        = string
    default     = "eu-central-1"
}

variable "lambda_function_name" {
    description = "Name of the Lambda function"
    type        = string
    default = "nonComplianceDashboard"
}

variable "dynamodb_table_name" {
    description = "Name of the DynamoDB table"
    type        = string
    default = "nonComplianceTable3"
}
