#variables.tf

variable "region" {
    description = "AWS region"
    type        = string
    default     = "eu-central-1"
}

variable "ses_Service_Name" {
    description = "Name of the Lambda function"
    type        = string
    default = "commencisclouddeneme"
}

variable "lambda_function_name" {
    description = "Name of the Lambda function"
    type        = string
    default = "MailSender"
}

variable "dynamodb_table_name_nonCompliance" {
    description = "Name of the DynamoDB table"
    type        = string
    default = "nonComplianceTable3"
}

variable "dynamodb_table_name_users" {
    description = "Name of the DynamoDB table"
    type        = string
    default = "excel-test-table"
}
