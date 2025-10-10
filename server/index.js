try { console.log("DB host =>", new URL(process.env.DATABASE_URL).hostname); }
catch (e) { console.error("DATABASE_URL inválida:", process.env.DATABASE_URL); }

import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ping raiz (para ver algo no navegador)
app.get("/", (_req, res) => {
  res.send("Uniboxxx API is up ✅");
});

// healthcheck para a Render
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});https://github.com/brunoasv-commits/Uniboxxx/blob/main/server/index.js

// listar contatos
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

// criar contato
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ API on :${port}`);
});


