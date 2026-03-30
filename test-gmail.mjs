import nodemailer from "nodemailer";

const gmailUser = "oxentech.startup@gmail.com";
const gmailPassword = "dlskwqszofvtdfsz";

console.log("🧪 Testando Gmail SMTP...\n");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  connectionTimeout: 10000,
  socketTimeout: 10000,
  auth: {
    user: gmailUser,
    pass: gmailPassword,
  },
});

console.log("1️⃣ Verificando autenticação...");
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ ERRO:", error.message);
    if (error.code === "EAUTH") {
      console.log("   ⚠️  Credenciais incorretas ou Gmail bloqueou o acesso");
    }
    process.exit(1);
  } else {
    console.log("✅ Autenticação OK!\n");
    
    console.log("2️⃣ Enviando email de teste...");
    transporter.sendMail({
      from: `"AgroColetivo Test" <${gmailUser}>`,
      to: "daniel.fer.nor8734@gmail.com",
      subject: "🧪 Email de Teste - AgroColetivo",
      html: "<p>Se recebeu este, o Gmail SMTP funciona!</p>",
    }, (error, info) => {
      if (error) {
        console.log("❌ ERRO:", error.message);
        process.exit(1);
      } else {
        console.log("✅ Email enviado com sucesso!");
        console.log("   ID:", info.messageId);
        process.exit(0);
      }
    });
  }
});
