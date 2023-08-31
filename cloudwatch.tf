resource "aws_cloudwatch_event_rule" "periodic_compliance_checker" {
    name = "periodic_compliance_checker"
    description = "Fires every five minutes"
    schedule_expression = "cron(00 9 ? * MON,WED,FRI *)"
}

resource "aws_cloudwatch_event_target" "check_compliance" {
    rule = aws_cloudwatch_event_rule.periodic_compliance_checker.name
    target_id = "lambda_function"
    arn = aws_lambda_function.lambda_function.arn
}

resource "aws_lambda_permission" "cloudwatch_permission" {
    statement_id = "AllowExecutionFromCloudWatch"
    action = "lambda:InvokeFunction"
    function_name = aws_lambda_function.lambda_function.function_name
    principal = "events.amazonaws.com"
    source_arn = aws_cloudwatch_event_rule.periodic_compliance_checker.arn
}