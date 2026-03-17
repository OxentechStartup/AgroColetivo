import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iepgeibcwthilohdlfse.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcGdlaWJjd3RoaWxvaGRsZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTUyOTYsImV4cCI6MjA4ODM5MTI5Nn0.Vvie7aAlKRS9O-Gbf2gCfMTMuBgwJcBi0XMdPFIKGzQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  try {
    console.log("🔄 Criando usuário admin via signUp...");

    const { data, error } = await supabase.auth.signUp({
      email: "oxentech.startup@gmail.com",
      password: "oxentech@8734",
      options: {
        data: {
          name: "Admin OxenTech",
          role: "admin",
        },
      },
    });

    if (error) {
      console.error("❌ Erro:", error.message);
      console.error("Status:", error.status);
      return;
    }

    console.log("✅ Admin criado com sucesso!");
    console.log("   ID:", data.user?.id);
    console.log("   Email:", data.user?.email);
    console.log(
      "   Confirmado:",
      data.user?.email_confirmed_at ? "Sim" : "Não",
    );
  } catch (err) {
    console.error("❌ Erro fatal:", err.message);
  }
}

createAdmin();
