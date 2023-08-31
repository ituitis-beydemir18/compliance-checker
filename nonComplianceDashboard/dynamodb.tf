resource "aws_dynamodb_table" "noncompliance_table" {
    name = var.dynamodb_table_name
    billing_mode = "PROVISIONED"
    read_capacity= "5"
    write_capacity= "5"
    attribute {
        name = "resource_type-resource_name"
        type = "S"
    }
    hash_key = "resource_type-resource_name"
}
