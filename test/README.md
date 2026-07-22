# Интеграционные тесты

Гоняют реальный клиент расширения (`SureService` + сгенерированный `Api`) против
живого инстанса Sure, поднятого через docker-compose.

Покрыто:
- **Банковский путь** (`sure-integration.test.ts`) — список счетов, создание операций,
  идемпотентность по `(external_id, source)`.
- **Инвестиции** (`sure-trades.test.ts`) — сделки buy/sell/dividend, пересчёт holdings
  воркером и клиентский дедуп (у trades в Sure нет `external_id`).
- **Схема настроек** (`settings.test.ts`) — чистый юнит-тест, Sure не нужен.

Создание счетов в расширении идёт через web-форму Sure (`SureInternalApi`, нужен
`DOMParser`) — в Node это не работает, поэтому счета для тестов заводятся сидами.

## Локальный запуск

```bash
export SURE_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
export SURE_ACCOUNT_DOMAIN=test-bank
export SURE_BASE_URL=http://127.0.0.1

# 1. Поднять Sure (web + worker + postgres + redis)
docker compose -f test/compose.sure.yml up -d

# 2. Дождаться готовности
until curl -sf $SURE_BASE_URL/up; do sleep 5; done

# 3. Засеять пользователя, API-ключ и обычный счёт
docker compose -f test/compose.sure.yml exec -T \
  -e SEED_API_KEY="$SURE_API_KEY" \
  -e SEED_ACCOUNT_DOMAIN="$SURE_ACCOUNT_DOMAIN" \
  web bin/rails runner - < test/sure-seed.rb

# 4. Засеять инвестиционный счёт (нужен для sure-trades.test.ts)
docker compose -f test/compose.sure.yml exec -T \
  -e SEED_INVEST_DOMAIN=tinvest-test \
  web bin/rails runner - < test/sure-seed-investment.rb

# 5. Прогнать тесты
pnpm test:integration        # всё из test/
pnpm exec vitest run test/settings.test.ts   # только юнит-тесты, без docker

# 6. Убрать
docker compose -f test/compose.sure.yml down -v
```

В CI то же самое делает `.github/workflows/integration.yml`.

> На macOS `localhost` может резолвиться в IPv6 и не отвечать — используйте
> `127.0.0.1`, как в примере выше.

## Отключённые CSRF и Origin

В тестовом стенде проверки CSRF-токена и заголовка `Origin` **отключены**: это
позволяет дёргать web-формы Sure (создание счетов) без выпарсивания
`authenticity_token` из HTML и без подмены `Origin`.

Как устроено: `test/disable-csrf.rb` монтируется в контейнер как
`config/initializers/zzz_disable_csrf.rb` и срабатывает только при `DISABLE_CSRF=true`
(задан в `test/compose.sure.yml`). Без этой переменной файл ничего не делает, поэтому
в боевой инстанс он попасть не может.

Проверить, что режим включён:

```bash
docker compose -f test/compose.sure.yml logs web | grep CSRF
# [TEST] CSRF и проверка Origin ОТКЛЮЧЕНЫ (DISABLE_CSRF=true)
```

Пример запроса без токена и с чужим `Origin` (должен вернуть 302, а не 422):

```bash
curl -s -c /tmp/j -b /tmp/j -X POST $SURE_BASE_URL/sessions \
  -H "Origin: https://evil.example.com" \
  --data-urlencode "email=integration@example.com" \
  --data-urlencode "password=password123" \
  -o /dev/null -w "%{http_code}\n"
```

⚠️ Только для локального стенда и CI. Никогда не включайте `DISABLE_CSRF` на
инстансе с реальными данными.

### Нюансы реализации

Флаги ставятся на класс через `ActiveSupport.on_load(:action_controller_base)`, а не
присваиванием в `Rails.application.config.action_controller.*` — в production
`ActionController` уже загружен (eager load), и конфиг к нему не применится.
Хук именно `_base`: общий `:action_controller` срабатывает ещё и для
`ActionController::API`, где CSRF-методов нет, и приложение падает на старте.
