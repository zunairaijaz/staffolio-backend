import nodemailer from "nodemailer";

export const sendMail = async (
  to: string,
  subject: string,
  html: string
) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL, 
      pass: process.env.EMAIL_PASSWORD, 
    },
  });

  await transporter.sendMail({
    from: `"Staffolio HR" <${process.env.EMAIL}>`,
    to,
    subject,
    html,
  });
};
