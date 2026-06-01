import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendAccessEmail({ to, accessUrl, ttlHours }) {
  const support = process.env.SUPPORT_EMAIL || "";

  const text =
    `Я получила вашу оплату, спасибо вам за доверие.\n\n` +
    `Чтобы открыть доступ, перейдите по ссылке:\n${accessUrl}\n\n` +
    `Ссылка действительна ${ttlHours} часов. Регистрируйтесь на тот же email, который вы указали при оплате.\n\n` +
    (support ? `Проблемы с доступом? Напишите мне на ${support}.\n` : "");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#222;max-width:520px;margin:0 auto">
    <p>Я получила вашу оплату, спасибо вам за доверие.</p>
    <p>Чтобы открыть доступ, перейдите по ссылке:</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${accessUrl}"
         style="background:#3C3022;color:#F4ECDF;text-decoration:none;padding:14px 28px;border-radius:10px;display:inline-block">
        Открыть доступ
      </a>
    </p>
    <p style="font-size:14px;color:#666">
      Ссылка действительна <b>${ttlHours} часов</b>.
      Регистрируйтесь на тот же email, который вы указали при оплате.
    </p>
    ${support ? `<p style="font-size:14px;color:#666">Проблемы с доступом? Напишите мне на <a href="mailto:${support}">${support}</a>.</p>` : ""}
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Ваш доступ к материалам",
    text,
    html,
  });
}

export async function sendConsultationEmail({ to, bookingUrl }) {
  const text =
    `Добрый день.\n\n` +
    `Я получила вашу оплату, спасибо вам за доверие.\n` +
    `Пожалуйста, забронируйте время консультации в моём календаре:\n${bookingUrl}\n\n` +
    `До встречи)`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#222;max-width:520px;margin:0 auto">
    <p>Добрый день.</p>
    <p>Я получила вашу оплату, спасибо вам за доверие.<br>
       Пожалуйста, забронируйте время консультации в моём календаре:</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${bookingUrl}"
         style="background:#3C3022;color:#F4ECDF;text-decoration:none;padding:14px 28px;border-radius:10px;display:inline-block">
        Забронировать время
      </a>
    </p>
    <p>До встречи)</p>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Консультация",
    text,
    html,
  });
}
