import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

// ====== DB ======
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ====== HEALTH ======
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// ====== SUAS ROTAS DE API ======
app.get("/api/contatos", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, telefone, created_at FROM contatos ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/contatos", async (req, res) => {
  try {
    const { nome, email, telefone } = req.body ?? {};
    const { rows } = await pool.query(
      "INSERT INTO contatos (nome, email, telefone) VALUES ($1, $2, $3) RETURNING id, nome, email, telefone, created_at",
      [nome, email, telefone]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ====== FRONTEND ESTÁTICO ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SEU build do front (gerado por npm run build) fica na raiz como /dist
const distPath = path.join(__dirname, "..", "dist");

// 1) arquivos estáticos (css, js, imgs)
app.use(express.static(distPath));

// 2) rota raiz -> carrega o app
app.get("/", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// 3) fallback SPA: qualquer rota que NÃO comece com /api cai no app
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ====== START ======
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API on :${port}`));
