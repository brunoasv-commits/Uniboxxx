// ===== IMPORTS =====
import express from "express";
import cors from "cors";
import pkg from "pg";

// ===== PG/NEON POOL =====
const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ex: postgres://user:pass@host/db
  ssl: { rejectUnauthorized: false },        // Necessário no Neon
});

// ===== APP BASE =====
const app = express();
app.use(cors());
app.use(express.json());

// Helper de query com captura de erro
async function q(text, params = []) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error("[DB ERROR]", err?.message || err);
    throw err;
  }
}

// ===== HEALTHCHECK =====
app.get("/api/health", async (req, res) => {
  try {
    const { rows } = await q("select version()");
    res.json({ ok: true, db: rows[0].version });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ======================================================================
// USERS (compatível com seu schema: id uuid, name text, email text unique)
// NADA de 'role' aqui.
// ======================================================================

// Lista usuários
app.get("/api/users", async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT id, name, email, created_at
       FROM public.users
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Buscar por id
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await q(
      `SELECT id, name, email, created_at
       FROM public.users
       WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar (sem 'role')
app.post("/api/users", async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    // upsert por email para facilitar testes
    const { rows } = await q(
      `INSERT INTO public.users (name, email)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, email, created_at`,
      [name, email]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ======================================================================
// CONTACTS
// Deixei GET e POST genéricos para você já conseguir inserir qualquer objeto.
// Se sua tabela tiver colunas específicas, dá para travar depois.
// ======================================================================

// Lista contatos
app.get("/api/contacts", async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT * FROM public.contacts ORDER BY 1 DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar contato (genérico: monta INSERT a partir do body)
app.post("/api/contacts", async (req, res) => {
  try {
    const payload = req.body || {};
    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);

    if (!keys.length) {
      return res.status(400).json({ error: "Body vazio" });
    }

    const cols = keys.map((k) => `"${k}"`).join(", ");
    const params = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map((k) => payload[k]);

    const sql = `INSERT INTO public.contacts (${cols}) VALUES (${params}) RETURNING *`;
    const { rows } = await q(sql, values);

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== NOT FOUND / ERROR HANDLERS =====
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ===== START =====
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
