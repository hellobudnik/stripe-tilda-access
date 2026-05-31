import Stripe from "stripe";
import crypto from "node:crypto";
import { markSessionOnce, saveToken } from "../lib/store.js";
import { sendAccessEmail } from "../lib/mailer.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Vercel: отключаем парсинг тела, Stripe требует «сырой» payload для проверки подписи.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // 1) Проверка подписи Stripe
  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Bad signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Нас интересует только успешное завершение Checkout / Payment Link
  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const session = event.data.object;

  try {
    // 2) Базовые проверки оплаты
    if (session.payment_status !== "paid") {
      return res.status(200).json({ skipped: "not_paid" });
    }
    const currency = (session.currency || "").toLowerCase();
    const requiredCurrency = (process.env.REQUIRED_CURRENCY || "eur").toLowerCase();
    if (currency !== requiredCurrency) {
      console.warn(`Currency ${currency} != ${requiredCurrency}, session ${session.id}`);
      return res.status(200).json({ skipped: "wrong_currency" });
    }

    // 3) Определяем price_id -> signup URL нужной группы Tilda
    const productMap = JSON.parse(process.env.PRODUCT_MAP || "{}");
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    let signupUrl = null;
    let matchedPrice = null;
    for (const item of lineItems.data) {
      const priceId = item.price && item.price.id;
      if (priceId && productMap[priceId]) {
        signupUrl = productMap[priceId];
        matchedPrice = priceId;
        break;
      }
    }
    if (!signupUrl) {
      console.warn(`No matching price for session ${session.id}`);
      return res.status(200).json({ skipped: "no_matching_product" });
    }

    // 4) Идемпотентность: обрабатываем сессию ровно один раз
    const first = await markSessionOnce(session.id);
    if (!first) {
      return res.status(200).json({ skipped: "already_processed" });
    }

    // 5) Email клиента
    const email =
      (session.customer_details && session.customer_details.email) ||
      session.customer_email;
    if (!email) {
      console.error(`No email in session ${session.id}`);
      return res.status(200).json({ skipped: "no_email" });
    }

    // 6) Одноразовый токен + ссылка доступа
    const token = crypto.randomBytes(24).toString("hex");
    const ttlHours = Number(process.env.TOKEN_TTL_HOURS || 48);
    await saveToken(token, {
      email,
      priceId: matchedPrice,
      signupUrl,
      sessionId: session.id,
    });

    const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    const accessUrl = `${base}/api/access/${token}`;

    // 7) Письмо
    await sendAccessEmail({ to: email, accessUrl, ttlHours });

    console.log(`Access email sent to ${email} (price ${matchedPrice}, session ${session.id})`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Handler error:", err);
    // 500 -> Stripe повторит доставку; идемпотентность защитит от дублей письма.
    return res.status(500).json({ error: "internal" });
  }
}
