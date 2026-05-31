# Авто-доступ в Tilda Members Area после оплаты Stripe (EUR)

Готовый скрипт. Схема:

1. Клиент платит по твоему **Stripe Payment Link** в евро.
2. Stripe шлёт событие `checkout.session.completed` на этот сервис.
3. Сервис проверяет подпись, что оплата `paid`, валюта `eur`, и что `price_id` есть в твоей карте продуктов.
4. Генерируется **одноразовый токен на 48 часов**, клиенту уходит письмо со ссылкой `…/api/access/ТОКЕН`.
5. Клиент открывает ссылку → токен «гасится» → происходит **редирект на Member Signup URL нужной группы Tilda**.
6. Tilda с авто-одобрением добавляет его в группу. Доступ открыт.

Повторные вебхуки от Stripe не приводят к повторным письмам (защита по `session_id`). Ссылка работает один раз и сгорает.

---

## Что тебе понадобится (всё с бесплатными тарифами)

- Аккаунт **Vercel** — где крутится скрипт.
- Аккаунт **Upstash** (Redis) — хранилище токенов.
- **SendPulse** — отправка писем по SMTP.
- Доступ к **Stripe** и к настройкам **Tilda Members Area**.

---

## Шаг 1. Tilda

1. Включи **Members Area** в проекте.
2. Создай **группу** под конкретный продукт и закрой нужные страницы доступом только для этой группы.
3. В настройках Members Area включи **Allow members to sign up through the form**.
4. В настройках группы включи **Approve membership requests without confirmation** (авто-одобрение).
5. Скопируй **Member signup URL** этой группы — он понадобится в Шаге 4.

Под каждый продукт — своя группа и свой signup URL.

---

## Шаг 2. Stripe

1. Открой свой **Payment Link** → посмотри привязанный Product → у него скопируй **Price ID** (вид `price_1Abc...`). Это и есть «сохранить price_id».
2. Проверь в Payment Link: продукт верный, валюта **EUR**, сбор **email обязателен**, после оплаты — redirect на твою thank-you страницу с текстом «Письмо с доступом придёт на указанный при оплате email».
3. Скопируй **Secret key**: Developers → API keys → `sk_live_…`
4. Вебхук создашь в Шаге 6 (когда узнаешь адрес сервиса).

---

## Шаг 3. Upstash (хранилище токенов)

1. Зарегистрируйся на upstash.com → Create Database → Redis (любой регион поближе, например EU).
2. На странице базы скопируй **UPSTASH_REDIS_REST_URL** и **UPSTASH_REDIS_REST_TOKEN** (раздел «REST API»).

---

## Шаг 4. SendPulse (почта)

1. В SendPulse: Настройки → **SMTP**. Включи SMTP, возьми **логин и пароль SMTP** (это отдельные от пароля кабинета).
2. Подтверди адрес отправителя (домен/email), с которого будут уходить письма — иначе спам.
   - `SMTP_HOST=smtp-pulse.com`, `SMTP_PORT=465`.

---

## Шаг 5. Деплой на Vercel

1. Загрузи эту папку в репозиторий GitHub (или импортируй папку напрямую через Vercel CLI).
2. На vercel.com → Add New → Project → выбери репозиторий.
3. Перед деплоем открой **Settings → Environment Variables** и заполни всё из файла `.env.example`:

   | Переменная | Откуда |
   |---|---|
   | `STRIPE_SECRET_KEY` | Stripe → API keys |
   | `STRIPE_WEBHOOK_SECRET` | появится в Шаге 6 |
   | `PRODUCT_MAP` | JSON: `price_id` → signup URL группы Tilda |
   | `REQUIRED_CURRENCY` | `eur` |
   | `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash |
   | `SMTP_HOST/PORT/USER/PASS` | SendPulse SMTP |
   | `MAIL_FROM` | напр. `Olga <info@tvoysite.com>` |
   | `SUPPORT_EMAIL` | твой адрес поддержки |
   | `PUBLIC_BASE_URL` | адрес проекта на Vercel |
   | `TOKEN_TTL_HOURS` | `48` |

   Пример `PRODUCT_MAP`:
   ```json
   {"price_1Abc...":"https://members.tvoysite.com/signup/group123"}
   ```

4. Нажми **Deploy**. После деплоя Vercel даст адрес вида `https://твой-проект.vercel.app`.
5. Впиши этот адрес в переменную `PUBLIC_BASE_URL` и сделай **Redeploy**.

---

## Шаг 6. Подключить вебхук Stripe

1. Stripe → Developers → **Webhooks** → **Add endpoint**.
2. Endpoint URL:
   ```
   https://твой-проект.vercel.app/api/stripe-webhook
   ```
3. Events to send: **`checkout.session.completed`**.
4. Создай endpoint → открой его → **Signing secret** → Reveal → скопируй `whsec_…`.
5. Вставь его в Vercel как `STRIPE_WEBHOOK_SECRET` → **Redeploy**.

---

## Шаг 7. Проверка

1. В Stripe включи **Test mode**, используй тестовый Payment Link и карту `4242 4242 4242 4242`.
2. Оплати → должно прийти письмо со ссылкой.
3. Открой ссылку → редирект на регистрацию в группе Tilda.
4. Открой ссылку второй раз → «Ссылка больше не активна».
5. В Stripe → Webhooks → твой endpoint видно успешные доставки (200). В Vercel → Logs виден `Access email sent…`.

После проверки переключи Stripe в **Live mode** и пропиши боевые ключи (`sk_live_…`, новый `whsec_…` боевого вебхука).

---

## Защита от передачи ссылки и её границы

- Письмо одноразовое и живёт 48 часов — переслать письмо другу бесполезно после первого открытия.
- **Честное ограничение:** в момент редиректа конечный Tilda signup URL виден в адресной строке. Очень настойчивый клиент может его скопировать. Полностью это закрывается только переходом на платформу с выдачей доступа по API (или режимом ручного подтверждения заявок). Для недорогих продуктов выбранный баланс «авто-доступ + токен» обычно достаточен.
- Усиление при желании: в письме и на thank-you page писать «регистрируйтесь на email, указанный при оплате», и периодически сверять участников группы Tilda с оплатами Stripe.

---

## Файлы

- `api/stripe-webhook.js` — приём оплаты, проверки, токен, письмо.
- `api/access/[token].js` — проверка токена и редирект в Tilda.
- `lib/store.js` — токены и идемпотентность (Upstash Redis).
- `lib/mailer.js` — письмо через SendPulse SMTP.
- `.env.example` — список всех переменных.
