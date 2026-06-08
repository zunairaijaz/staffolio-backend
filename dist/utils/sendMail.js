"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const mail_1 = require("../config/mail");
const sendMail = async (to, subject, html) => {
    const transporter = (0, mail_1.createMailTransporter)();
    await transporter.sendMail({
        from: (0, mail_1.getMailFrom)(),
        to,
        subject,
        html,
    });
};
exports.sendMail = sendMail;
