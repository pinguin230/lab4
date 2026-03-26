# serverless-lab4

Serverless-проєкт на AWS, який:
- щогодини генерує погодний digest (Lambda + EventBridge Scheduler),
- зберігає його в S3,
- віддає останній digest через HTTP API (API Gateway + Lambda).

Інфраструктура описана Terraform-модулями, середовище `dev` знаходиться в `envs/dev`.

## Архітектура

Потік даних:
1. `EventBridge Scheduler` запускає `digest_generator` раз на годину.
2. `digest_generator` звертається до Open-Meteo API.
3. Lambda пише JSON у S3:
   - архів: `digests/YYYY/MM/DD/HH.json`
   - актуальний: `digests/latest.json`
4. `API Gateway` маршрут `GET /digest/latest` викликає `digest_reader`.
5. `digest_reader` читає `digests/latest.json` із S3 і повертає JSON у відповіді API.

## Структура репозиторію

```text
envs/dev/                     # root module для dev
modules/
  api_gateway/                # HTTP API + integration + permission
  eventbridge_scheduler/      # schedule + IAM роль для invoke Lambda
  lambda/                     # zip-packaging + IAM + Lambda
  s3/                         # S3 bucket + versioning
src/
  digest_generator/           # Lambda генерації digest
  digest_reader/              # Lambda читання останнього digest
```

## Передумови

- AWS акаунт з правами на створення IAM/S3/Lambda/API Gateway/EventBridge Scheduler.
- Налаштовані AWS credentials у середовищі (AWS CLI profile або змінні середовища).
- Terraform `>= 1.10.0` (див. `envs/dev/providers.tf`).
- Python 3.12 (runtime Lambda у `envs/dev/main.tf`).

## Важливо про backend

У `envs/dev/backend.tf` зафіксований S3 backend bucket:
- `tf-state-lab4-teslia-mykola-20`

Переконайтесь, що bucket існує у вашому AWS акаунті і доступний у регіоні `eu-central-1`.
Якщо ні - змініть `backend.tf` під свій bucket перед `terraform init`.

## Швидкий старт (deploy dev)

```powershell
Set-Location D:\serverless-lab4\envs\dev
terraform init
terraform fmt -recursive ..\..
terraform validate
terraform plan -out tfplan
terraform apply tfplan
```

Отримати outputs:

```powershell
terraform output
terraform output api_endpoint
terraform output digest_bucket_name
```

Перевірити API:

```powershell
$api = terraform output -raw api_endpoint
Invoke-RestMethod -Uri "$api/digest/latest" -Method Get
```

> Примітка: одразу після deploy digest може ще не існувати, поки не спрацює scheduler або поки ви вручну не викличете Lambda generator.

## Налаштування змінних

Базові змінні для `dev` у `envs/dev/variables.tf`:
- `aws_region` (default `eu-central-1`)
- `project_name` (default `serverless-digest`)
- `environment` (default `dev`)
- `weather_latitude`, `weather_longitude`, `weather_location_name`

Приклад використання `terraform.tfvars` (локально, не комітити секрети):

```hcl
aws_region            = "eu-central-1"
project_name          = "serverless-digest"
environment           = "dev"
weather_latitude      = "49.84"
weather_longitude     = "24.03"
weather_location_name = "Lviv"
```

## Локальний запуск Python-коду (опційно)

`requirements.txt` у `src/digest_generator` та `src/digest_reader` зараз порожні, бо в Lambda використовується `boto3` з AWS runtime.

Для локальної перевірки вам зазвичай потрібні:
- валідні AWS credentials,
- існуючий S3 bucket,
- змінні середовища Lambda.

Приклад для `digest_reader`:

```powershell
Set-Location D:\serverless-lab4
$env:DIGEST_BUCKET = "<your-bucket-name>"
python -c "from src.digest_reader.app import lambda_handler; print(lambda_handler({}, None))"
```

Приклад для `digest_generator`:

```powershell
Set-Location D:\serverless-lab4
$env:DIGEST_BUCKET = "<your-bucket-name>"
$env:WEATHER_LATITUDE = "49.84"
$env:WEATHER_LONGITUDE = "24.03"
$env:WEATHER_LOCATION_NAME = "Lviv"
python -c "from src.digest_generator.app import lambda_handler; print(lambda_handler({}, None))"
```

## Видалення ресурсів

```powershell
Set-Location D:\serverless-lab4\envs\dev
terraform destroy
```

## Git та безпека

- У репозиторії додано `.gitignore` для Terraform state, кешів Python та IDE-файлів.
- `*.tfvars` ігноруються, щоб випадково не комітити чутливі значення.
- `.terraform.lock.hcl` не ігнорується (правильна практика для відтворюваності провайдерів).

## Примітка

У `src/app.py` є окремий приклад Lambda для DynamoDB, який не використовується поточною Terraform-конфігурацією `envs/dev`.

