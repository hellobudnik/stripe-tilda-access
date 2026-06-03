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

const SIGNATURE =
  "\n\n***\n\n" +
  "🌿🦋 Ольга Будник\n" +
  "Богослов, мастер-коуч ICI\n" +
  "Проводник для близнецовых пламен\n" +
  "ТГ: @olgasoulcoach\n" +
  "olgabudnik.com";

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
    SIGNATURE;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Ваш доступ к материалам",
    text,
  });
}

export async function sendConsultationEmail({ to, bookingUrl }) {
  const text =
    "Добрый день.\n\n" +
    "Я получила вашу оплату, спасибо вам за доверие.\n\n" +
    `Пожалуйста, забронируйте время консультации в моём календаре: ${bookingUrl}\n\n` +
    "До встречи)\n\n" +
    "Обнимаю,\nОльга" +
    SIGNATURE;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Консультация",
    text,
  });
}
