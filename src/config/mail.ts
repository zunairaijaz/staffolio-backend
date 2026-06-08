import nodemailer from "nodemailer";

export const getMailFrom = () => {
  const email = process.env.EMAIL!;
  const name = process.env.EMAIL_FROM_NAME || "Staffolio HR";
  return `"${name}" <${email}>`;
};

export const createMailTransporter = () => {
  const pass = (process.env.EMAIL_PASSWORD ?? "").replace(/\s/g, "");

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass,
    },
  });
};
