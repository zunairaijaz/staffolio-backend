import { createMailTransporter, getMailFrom } from "../config/mail";

export const sendMail = async (
  to: string,
  subject: string,
  html: string
) => {
  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject,
    html,
  });
};
