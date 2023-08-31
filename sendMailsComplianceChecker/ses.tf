

resource "aws_ses_domain_identity" "example" {
  domain = "commencis2.cloud"
}

# This will output the verification token you need to add to your DNS provider
output "ses_verification_token" {
  description = "The SES domain identity verification token. Add this as a TXT record to your DNS."
  value       = aws_ses_domain_identity.example.verification_token
}

data "aws_iam_policy_document" "example" {
  statement {
    actions   = [
      "SES:SendEmail", 
      "SES:SendRawEmail", 
      "ses:SendTemplatedEmail",
      "ses:SendBulkTemplatedEmail",
      "ses:GetEmailIdentity"
      ]
    resources = [aws_ses_domain_identity.example.arn]

    principals {
      identifiers = ["arn:aws:iam::600259904892:root"]
      type        = "AWS"
    }
  }
}


resource "aws_ses_domain_dkim" "example" {
  domain = aws_ses_domain_identity.example.domain
}

resource "aws_ses_identity_policy" "example" {
  identity = aws_ses_domain_identity.example.arn
  name     = "example"
  policy   = data.aws_iam_policy_document.example.json
}



