# sns.tf

resource "aws_sns_topic" "sns_topic" {
  name = var.sns_topic_name
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "SNS:Publish",
      "Resource": "*"
    }
  ]
}
POLICY
}

resource "aws_sns_topic" "sns_fallback_topic" {
  name = var.sns_fallback_topic_name
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "SNS:Publish",
      "Resource": "*"
    }
  ]
}
POLICY
}
