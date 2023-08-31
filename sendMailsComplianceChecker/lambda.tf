
resource "aws_iam_role" "iam_for_lambda" {
    name = "${var.lambda_function_name}_execution"

    assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
        {
            Action = "sts:AssumeRole"
            Effect = "Allow"
            Principal = {
            Service = "lambda.amazonaws.com"
            }
        },
        ]
    })
}

resource "aws_iam_role_policy" "iam_policy_for_lambda" {
    name = "${var.lambda_function_name}_execution_policy"
    role = aws_iam_role.iam_for_lambda.id

    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
            {
                Sid = "VisualEditor0",
                Effect = "Allow",
                Action = "logs:CreateLogGroup",
                Resource = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"
            },
            {
                Sid = "VisualEditor1",
                Effect = "Allow",
                Action = [
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
                Resource = [
                    "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.lambda_function_name}:*"
                ]
            },
            {
                Sid = "VisualEditor3",
                Effect = "Allow",
                Action = [
                    "dynamodb:GetItem",
                    "dynamodb:GetRecords",
                    "dynamodb:BatchGetItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                ],
                Resource = [
                    "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.dynamodb_table_name_nonCompliance}",
                    "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.dynamodb_table_name_users}"
                ]
            },
            {
                Sid = "VisualEditor4",
                Effect = "Allow",
                Action= [
                    "ses:SendEmail",
                    "ses:SendCustomVerificationEmail",
                    "ses:SendRawEmail",
                    "ses:SendBounce"
                ],
                Resource= ["arn:aws:ses:eu-central-1:600259904892:identity/commencis.cloud"]
            },
            {
                Sid="VisualEditor5",
                Effect= "Allow",
                Action= [
                    "ses:GetSendQuota",
                    "ses:GetSendStatistics"
                ],
                Resource= "*"
            },
        ]
    })
}

resource "aws_lambda_function" "lambda_function" {
    filename      = "lambda_handler.zip"
    function_name = var.lambda_function_name
    role          = aws_iam_role.iam_for_lambda.arn
    handler       = "lambda_handler.lambda_handler"
    runtime       = "python3.11"
    timeout       = 300

    environment {
        variables = {
            DYNAMODB_ARN = aws_dynamodb_table.noncompliance_table.arn
            DYNAMODB_TABLE_NAME_NONCOMPLIANCE = var.dynamodb_table_name_nonCompliance
            DYNAMODB_TABLE_NAME_USERS = var.dynamodb_table_name_users
        }
    }
}
