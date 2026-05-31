import { consumeToken } from "../../lib/store.js";

const SUPPORT = process.env.SUPPORT_EMAIL || "";

function page(title, message) {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;margin:0">
  <div style="max-width:480px;margin:80px auto;background:#fff;padding:36px;border-radius:12px;text-align:center;color:#222">
    <h2 style="margin-top:0">${title}</h2>
    <p style="color:#555;line-height:1.5">${message}</p>
    ${SUPPORT ? `<p style="color:#888;font-size:14px">Напишите нам: <a href="mailto:${SUPPORT}">${SUPPORT}</a></p>` : ""}
  </div>
</body></html>`;
}

export default async function handler(req, res) {
  const token = req.query.token;

  if (!token || typeof token !== "string") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(page("Ссылка недействительна", "Токен не найден в ссылке."));
  }

  let result;
  try {
    result = await consumeToken(token);
  } catch (err) {
    console.error("consumeToken error:", err);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(page("Временная ошибка", "Попробуйте обновить страницу через минуту."));
  }

  if (!result.ok) {
    const msg =
      result.reason === "already_used"
        ? "Эта ссылка уже была использована. Доступ можно открыть только один раз."
        : "Срок действия ссылки истёк или она недействительна.";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(410).send(page("Ссылка больше не активна", msg));
  }

  // Успех: редирект на регистрацию в нужной группе Tilda.
  console.log(`Token consumed for ${result.data.email} -> ${result.data.signupUrl}`);
  res.writeHead(302, { Location: result.data.signupUrl });
  return res.end();
}
