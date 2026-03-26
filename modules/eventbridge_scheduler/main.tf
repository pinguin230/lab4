resource "aws_iam_role" "scheduler_role" {
  name = "${var.schedule_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "scheduler.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler_policy" {
  name = "${var.schedule_name}-policy"
  role = aws_iam_role.scheduler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "lambda:InvokeFunction"
      ]
      Resource = var.target_lambda_arn
    }]
  })
}

resource "aws_scheduler_schedule" "this" {
  name                         = var.schedule_name
  schedule_expression          = var.schedule_expression
  schedule_expression_timezone = "UTC"
  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = var.target_lambda_arn
    role_arn = aws_iam_role.scheduler_role.arn

    input = jsonencode({
      trigger = "hourly-digest"
    })
  }
}