# LAB4 Defense Guide

Цей файл - короткий конспект для захисту лабораторної: що є в проєкті, для чого кожен ключовий файл, і як проходить загальний serverless flow.

## 1) Суть проєкту в 30 сек

Проєкт будує serverless-систему на AWS:
- `EventBridge Scheduler` щогодини запускає Lambda-генератор дайджесту погоди.
- Генератор зберігає JSON у S3 (архів + latest).
- `API Gateway` віддає останній дайджест через Lambda-ридер по `GET /digest/latest`.
- Усе піднято Terraform-модулями.

## 2) Що за що відповідає (директорії)

- `envs/dev/` - root Terraform-конфіг саме для dev-середовища.
- `modules/` - перевикористовувані Terraform-модулі (S3, Lambda, API Gateway, Scheduler).
- `src/digest_generator/` - код Lambda, яка формує і записує digest.
- `src/digest_reader/` - код Lambda, яка читає `digests/latest.json`.
- `src/app.py` - окремий приклад Lambda для DynamoDB, не підключений у поточному `envs/dev/main.tf`.

## 3) Ключові Terraform файли

### `envs/dev/backend.tf`
- Налаштовує remote backend Terraform у S3 (`tf-state-lab4-teslia-mykola-20`).
- Це бакет для `terraform.tfstate`, не для даних застосунку.

### `envs/dev/providers.tf`
- Фіксує вимоги: Terraform `>= 1.10.0`, провайдери `hashicorp/aws` і `hashicorp/archive`.
- Визначає AWS регіон через змінну `aws_region`.

### `envs/dev/variables.tf`
- Базові змінні середовища: регіон, назва проєкту, environment, координати і назва локації.

### `envs/dev/main.tf`
- Збирає всю інфраструктуру з модулів:
  - `module "s3_digest"` -> S3 бакет для digest-файлів.
  - `module "lambda_generator"` -> Lambda, що генерує digest.
  - `module "lambda_reader"` -> Lambda, що читає latest digest.
  - `module "api_gateway"` -> HTTP API маршрут `GET /digest/latest`.
  - `module "scheduler"` -> запуск генератора по `rate(1 hour)`.

### `envs/dev/outputs.tf`
- Повертає `api_endpoint` і `digest_bucket_name` після apply.

## 4) Ключові модулі (Terraform)

### `modules/s3/main.tf`
- Створює бакет і вмикає versioning.

### `modules/lambda/main.tf`
- Пакує код Lambda в zip через `archive_file`.
- Створює окрему IAM роль і inline policy для кожної Lambda.
- Політика включає CloudWatch Logs + доступ до конкретного S3 bucket ARN.

### `modules/api_gateway/main.tf`
- Створює HTTP API, integration типу `AWS_PROXY`, route, default stage.
- Дає permission API Gateway викликати Lambda Reader.

### `modules/eventbridge_scheduler/main.tf`
- Створює schedule + IAM роль, яка може викликати Lambda Generator.

## 5) Ключові Python файли

### `src/digest_generator/app.py`
- Читає env-змінні (`DIGEST_BUCKET`, координати, назву локації).
- Викликає Open-Meteo API.
- Формує payload і записує:
  - `digests/%Y/%m/%d/%H.json` (архів)
  - `digests/latest.json` (остання версія)
- Повертає `statusCode: 200` і ключ створеного обʼєкта.

### `src/digest_reader/app.py`
- Читає `digests/latest.json` із S3.
- Віддає JSON через API (`statusCode: 200`).
- Якщо файла нема -> `statusCode: 404`.

## 6) Загальний flow (що проговорити на захисті)

1. Terraform створює S3, Lambda-и, API Gateway, Scheduler, IAM ролі.
2. Scheduler щогодини викликає `digest-generator`.
3. Generator пише digest у S3.
4. Клієнт викликає API `GET /digest/latest`.
5. API Gateway тригерить `digest-reader`.
6. Reader читає `digests/latest.json` і повертає відповідь клієнту.

## 7) Відповіді на типові питання викладача

- Чому два різні S3 бакети?
  - Один у `backend.tf` для Terraform state, інший (через `module "s3_digest"`) для даних застосунку.

- Чи окрема роль для кожної Lambda?
  - Так, у модулі Lambda роль називається за `function_name`, тому для generator/reader ролі різні.

- Як формується назва ресурсів?
  - Через `local.prefix = "${var.project_name}-${var.environment}"`.

- Чому може бути `404` на `/digest/latest`?
  - Ще не було успішного запуску generator, або немає `digests/latest.json` у S3.

- Що показати як доказ працездатності?
  - `terraform output api_endpoint`, запит до endpoint, наявність `digests/latest.json` у бакеті.

## 8) Короткий чеклист перед захистом

- `terraform output` показує валідний `api_endpoint`.
- Запит до `/digest/latest` повертає JSON (або пояснюваний 404 до першого запуску).
- У S3 видно `digests/latest.json` і архівні файли.
- Розумієте різницю між backend bucket і application bucket.
- Можете пояснити призначення кожного модуля за 1-2 речення.

