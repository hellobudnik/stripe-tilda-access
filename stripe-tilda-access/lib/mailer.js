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

const SIGNATURE_TEXT =
  "\n\n***\n\n" +
  "🌿🦋 Ольга Будник\n" +
  "Богослов, мастер-коуч ICI\n" +
  "Проводник для близнецовых пламен\n" +
  "ТГ: @olgasoulcoach\n" +
  "olgabudnik.com";

const LINK_COLOR = "#7A6850";
const BTN_COLOR = "#3C3022";

const SIGNATURE_HTML =
  "<br><br><hr style='border:none;border-top:1px solid #e0d8cc;'><br>" +
  "🌿🦋 <strong>Ольга Будник</strong><br>" +
  "Богослов, мастер-коуч ICI<br>" +
  "Проводник для близнецовых пламен<br>" +
  `ТГ: <a href='https://t.me/olgasoulcoach' style='color:${LINK_COLOR};'>@olgasoulcoach</a><br>` +
  `<a href='https://olgabudnik.com' style='color:${LINK_COLOR};'>olgabudnik.com</a>`;

export async function sendAccessEmail({ to, accessUrl, ttlHours }) {
  const support = process.env.SUPPORT_EMAIL || "";

  const text =
    "Добрый день.\n\n" +
    "Я получила вашу оплату, спасибо вам за доверие.\n\n" +
    `Чтобы открыть доступ, перейдите по ссылке: ${accessUrl}\n\n` +
    `Ссылка действительна ${ttlHours} часов. Регистрируйтесь на тот же email, который вы указали при оплате.\n\n` +
    "После активации доступа у вас появится личный кабинет, который всегда будет доступен по этой ссылке: http://olgabudnik.com/members/login\n\n" +
    (support ? `Если возникнут сложности с доступом, напишите мне на ${support}.\n\n` : "") +
    "Обнимаю,\nОльга" +
    SIGNATURE_TEXT;

  const html =
    "<p>Добрый день.</p>" +
    "<p>Я получила вашу оплату, спасибо вам за доверие.</p>" +
    `<p>Чтобы открыть доступ, нажмите на кнопку ниже или перейдите по ссылке:</p>` +
    `<p><a href="${accessUrl}" style="display:inline-block;padding:12px 24px;background:${BTN_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:500;">Открыть доступ</a></p>` +
    `<p>Или скопируйте ссылку вручную:<br><a href="${accessUrl}" style="color:${LINK_COLOR};">${accessUrl}</a></p>` +
    `<p>Ссылка действительна ${ttlHours} часов. Регистрируйтесь на тот же email, который вы указали при оплате.</p>` +
    `<p>После активации доступа у вас появится личный кабинет, который всегда будет доступен по этой ссылке:<br><a href="http://olgabudnik.com/members/login" style="color:${LINK_COLOR};">olgabudnik.com/members/login</a></p>` +
    (support ? `<p>Если возникнут сложности с доступом, напишите мне на <a href="mailto:${support}" style="color:${LINK_COLOR};">${support}</a>.</p>` : "") +
    "<p>Обнимаю,<br>Ольга</p>" +
    SIGNATURE_HTML;

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
    "Добрый день.\n\n" +
    "Я получила вашу оплату, спасибо вам за доверие.\n\n" +
    `Пожалуйста, забронируйте время консультации в моём календаре: ${bookingUrl}\n\n` +
    "До встречи)\n\n" +
    "Обнимаю,\nОльга" +
    SIGNATURE_TEXT;

  const html =
    "<p>Добрый день.</p>" +
    "<p>Я получила вашу оплату, спасибо вам за доверие.</p>" +
    "<p>Пожалуйста, забронируйте время консультации в моём календаре:</p>" +
    `<p><a href="${bookingUrl}" style="display:inline-block;padding:12px 24px;background:${BTN_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:500;">Выбрать время</a></p>` +
    `<p>Или перейдите по ссылке: <a href="${bookingUrl}" style="color:${LINK_COLOR};">${bookingUrl}</a></p>` +
    "<p>До встречи)</p>" +
    "<p>Обнимаю,<br>Ольга</p>" +
    SIGNATURE_HTML;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Консультация",
    text,
    html,
  });
}
