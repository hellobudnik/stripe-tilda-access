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
  // NX = поставить только если ключа ещё нет
  const res = await redis.set(key, "1", { nx: true, ex: 7 * 24 * 60 * 60 });
  return res === "OK";
}

// Сохранить одноразовый токен доступа.
export async function saveToken(token, data) {
  const key = `token:${token}`;
  await redis.set(
    key,
    JSON.stringify({ ...data, used: false, createdAt: Date.now() }),
    { ex: TTL_SECONDS }
  );
}

// Атомарно «использовать» токен: вернёт данные, если токен валиден и ещё не использован,
// иначе вернёт причину отказа. Защищает от двойного клика и гонки.
export async function consumeToken(token) {
  const key = `token:${token}`;
  const raw = await redis.get(key);
  if (!raw) return { ok: false, reason: "not_found_or_expired" };

  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (data.used) return { ok: false, reason: "already_used" };

  // Помечаем использованным. TTL не трогаем (ключ всё равно сам истечёт).
  data.used = true;
  data.usedAt = Date.now();
  await redis.set(key, JSON.stringify(data), { keepTtl: true });
  return { ok: true, data };
}
