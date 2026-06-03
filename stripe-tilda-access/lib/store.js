import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TTL_HOURS = Number(process.env.TOKEN_TTL_HOURS || 48);
const TTL_SECONDS = TTL_HOURS * 60 * 60;

// Идемпотентность: вернёт true только при ПЕРВОЙ обработке данной сессии Stripe.
// Запись держим 7 дней — этого хватает, т.к. Stripe ретраит вебхук ~3 дня.
export async function markSessionOnce(sessionId) {
  const key = `stripe:session:${sessionId}`;
  const res = await redis.set(key, "1", { nx: true, ex: 7 * 24 * 60 * 60 });
  return res === "OK";
}

// Сохранить токен доступа.
export async function saveToken(token, data) {
  const key = `token:${token}`;
  await redis.set(
    key,
    JSON.stringify({ ...data, createdAt: Date.now() }),
    { ex: TTL_SECONDS }
  );
}

// Проверить токен. Ссылка многоразовая: пока токен не истёк (48 часов),
// возвращаем данные. Срок жизни обеспечивается автоудалением ключа из Redis.
export async function resolveToken(token) {
  const key = `token:${token}`;
  const raw = await redis.get(key);
  if (!raw) return { ok: false, reason: "not_found_or_expired" };

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return { ok: true, data };
}
