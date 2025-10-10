// ====== FRONTEND ESTÁTICO ======
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// /opt/render/project/src/server  ->  dist fica em  /opt/render/project/src/dist
const distPath = path.join(__dirname, "..", "dist");
console.log(">> distPath:", distPath);

// 1) servir arquivos estáticos do build
app.use(express.static(distPath));

// 2) rota raiz -> index.html com try/catch pra logar qualquer erro
app.get("/", (_req, res) => {
  try {
    res.sendFile(path.join(distPath, "index.html"));
  } catch (err) {
    console.error("Erro ao enviar index.html:", err);
    res.status(500).send("Erro ao carregar a aplicação");
  }
});

// 3) SPA fallback: qualquer rota que NÃO comece com /api ou /healthz cai no app
app.get(/^\/(?!api|healthz).*/, (_req, res) => {
  try {
    res.sendFile(path.join(distPath, "index.html"));
  } catch (err) {
    console.error("Erro no fallback SPA:", err);
    res.status(500).send("Erro ao carregar a aplicação");
  }
});

// 4) (opcional) capturador de erros gerais pra não derrubar o processo
app.use((err, _req, res, _next) => {
  console.error("Erro não tratado:", err);
  res.status(500).send("Erro interno");
});
