// ===== IMPORTS =====
import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ===== APP =====
const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

// ===== DB =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===== HEALTH =====
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// ===== API =====
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

// ===== FRONTEND ESTÁTICO =====
// Caminho do /dist gerado pelo "npm run build" na RAIZ do repo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "..", "dist");
console.log(">> distPath:", distPath, "exists:", fs.existsSync(distPath));

// Serve assets do build (css, js, img)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Rota raiz -> index.html
app.get("/", (_req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  // fallback se não houver build
  res
    .status(503)
    .send("Build não encontrado. Rode 'npm run build' na raiz do projeto.");
});

// SPA fallback: qualquer rota que NÃO comece com /api ou /healthz
app.get(/^\/(?!api|healthz).*/, (_req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  res
    .status(503)
    .send("Build não encontrado. Rode 'npm run build' na raiz do projeto.");
});

// Captura erros não tratados (para evitar 502)
app.use((err, _req, res, _next) => {
  console.error("Erro não tratado:", err);
  res.status(500).send("Erro interno");
});

// ===== START =====
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API on :${port}`));
