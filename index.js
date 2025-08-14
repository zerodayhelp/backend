// functions/index.js
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

exports.checkSmtpAndSend = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {
    smtp_server: smtpServer,
    smtp_port: smtpPort,
    smtp_username: smtpUsername,
    smtp_password: smtpPassword,
    test_email: testEmail,
    enteredUser,
  } = req.body || {};

  if (
    !smtpServer ||
    !smtpPort ||
    !smtpUsername ||
    !smtpPassword ||
    !testEmail ||
    !enteredUser
  ) {
    return res.status(200).send("unknownerror");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpServer,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUsername,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    });

    // 1) Connect + authenticate
    await transporter.verify();
    let output = "accesscorrect-";

    // 2) Send test message
    const info = await transporter.sendMail({
      from: `"SMTP Tester" <${smtpUsername}>`,
      to: testEmail,
      subject: `Welcome: #${enteredUser}`,
      text: `Your SMTP is working (TLS/SSL). User: #${enteredUser}`,
    });

    if (!info || !info.accepted || info.accepted.length === 0) {
      throw new Error("SMTP send failed");
    }

    output += "sendcorrect";
    return res.status(200).send(output);
  } catch (err) {
    const msg = (err && err.message ? err.message : "").toLowerCase();

    if (
      msg.includes("connect") ||
      msg.includes("auth") ||
      msg.includes("handshake") ||
      msg.includes("timed out")
    ) {
      return res.status(200).send("accesserror-");
    }

    if (
      msg.includes("send") ||
      msg.includes("rcpt") ||
      msg.includes("mail from")
    ) {
      return res.status(200).send("senderror");
    }

    console.error("SMTP check error:", err);
    return res.status(200).send("unknownerror");
  }
});
