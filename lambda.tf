# lambda.tf

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
        Action = [
          "config:DescribeComplianceByResource",
          "cloudtrail:LookupEvents",
          "sns:Publish",
				  "tag:GetResources"
        ],
        Resource = "*"
      },
      {
        Sid = "VisualEditor1",
        Effect = "Allow",
        Action = "ec2:DescribeInstances",
        Resource = "*"
      },
      {
        Sid = "VisualEditor2",
        Effect = "Allow",
        Action = "logs:CreateLogGroup",
        Resource = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid = "VisualEditor3",
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
        Sid = "VisualEditor4",
        Effect = "Allow",
        Action = [
          "sns:Subscribe",
          "sns:Receive"
        ],
        Resource = aws_sns_topic.sns_topic.arn
      },
      {
        "Sid": "VisualEditor5",
        "Effect": "Allow",
        "Action": [
          "dynamodb:*"
        ],
        "Resource": [
          "arn:aws:dynamodb:eu-central-1:600259904892:table/nonComplianceTable3"
        ]
		  }
    ]
  })
}

resource "aws_lambda_function" "lambda_function" {
  filename      = "handler_paginated.zip"
  function_name = var.lambda_function_name
  role          = aws_iam_role.iam_for_lambda.arn
  handler       = "handler_paginated.handler"
  runtime       = "nodejs18.x"
  timeout       = 300

  environment {
    variables = {
      TAG_KEY        = "tag_key_to_check"
      SNS_TOPIC_ARN  = aws_sns_topic.sns_topic.arn
      FALLBACK_SNS_TOPIC_ARN = aws_sns_topic.sns_fallback_topic.arn
      
    }
  }
}
