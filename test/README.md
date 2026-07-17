# Интеграционные тесты

Гоняют реальный клиент расширения (`SureService` + сгенерированный `Api`) против
живого инстанса Sure, поднятого через docker-compose. Проверяют критичный путь
синхронизации по `X-Api-Key`: список счетов, создание операций и идемпотентность
по `(external_id, source)`.

Создание счёта через CSRF-флоу (`SureInternalApi`) браузерное (нужен DOMParser)
и здесь не покрывается — оно защищено подменой Origin на nginx и проверяется руками.

## Локальный запуск

```bash
export SURE_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
export SURE_ACCOUNT_DOMAIN=test-bank
export SURE_BASE_URL=http://localhost:3000

# 1. Поднять Sure
docker compose -f test/compose.sure.yml up -d

# 2. Дождаться готовности
until curl -sf http://localhost:3000/up; do sleep 5; done

# 3. Засеять пользователя, API-ключ и счёт
docker compose -f test/compose.sure.yml exec -T \
  -e SEED_API_KEY="$SURE_API_KEY" \
  -e SEED_ACCOUNT_DOMAIN="$SURE_ACCOUNT_DOMAIN" \
  web bin/rails runner - < test/sure-seed.rb

# 4. Прогнать тесты
pnpm test:integration

# 5. Убрать
docker compose -f test/compose.sure.yml down -v
```

В CI то же самое делает `.github/workflows/integration.yml`.
