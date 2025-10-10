// ===== IMPORTS =====
import express from "express";
import cors from "cors";
import pkg from "pg";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ===== APP/DB =====
const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

// Log simples de requisições
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Conexão Neon (DATABASE_URL definido no Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===== HEALTH =====
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// ===== HELPERS =====
function toUUID(v) {
  return typeof v === "string" && v.length >= 36 ? v : null;
}
async function resolveUserId(client, explicitUserId) {
  const fromBody = toUUID(explicitUserId);
  if (fromBody) return fromBody;

  // pega o primeiro usuário existente
  const { rows } = await client.query("SELECT id FROM users ORDER BY id LIMIT 1");
  if (!rows.length) {
    throw new Error('Não há usuários na tabela "users" para preencher user_id');
  }
  return rows[0].id;
}

// ===== CONTACTS (oficial) =====
// GET /api/contacts -> lista contatos
async function listContactsHandler(_req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id AS "userId", name, type, email, phone, created_at AS "createdAt"
         FROM contacts
        ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
}

// POST /api/contacts -> cria contato
async function createContactHandler(req, res) {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    const name = b.name ?? b.nome ?? null;
    const email = b.email ?? null;
    const phone = b.phone ?? b.telefone ?? null;
    const type = b.type ?? "Cliente"; // padrão

    if (!name) {
      return res.status(400).json({ error: "missing_name", detail: "Campo 'name' é obrigatório." });
    }

    const userId = await resolveUserId(client, b.userId);

    const { rows } = await client.query(
      `INSERT INTO contacts (user_id, name, type, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id AS "userId", name, type, email, phone, created_at AS "createdAt"`,
      [userId, name, type, email, phone]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  } finally {
    client.release();
  }
}

// PUT /api/contacts/:id -> atualiza contato
async function updateContactHandler(req, res) {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const name = b.name ?? b.nome ?? null;
    const email = b.email ?? null;
    const phone = b.phone ?? b.telefone ?? null;
    const type = b.type ?? null;

    const { rows } = await pool.query(
      `UPDATE contacts
          SET name  = COALESCE($2, name),
              type  = COALESCE($3, type),
              email = COALESCE($4, email),
              phone = COALESCE($5, phone)
        WHERE id = $1
      RETURNING id, user_id AS "userId", name, type, email, phone, created_at AS "createdAt"`,
      [id, name, type, email, phone]
    );

    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
}

// DELETE /api/contacts/:id -> apaga contato
async function deleteContactHandler(req, res) {
  try {
    const id = req.params.id;
    await pool.query("DELETE FROM contacts WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
}

// Rotas oficiais
app.get("/api/contacts", listContactsHandler);
app.post("/api/contacts", createContactHandler);
app.put("/api/contacts/:id", updateContactHandler);
app.delete("/api/contacts/:id", deleteContactHandler);

// ===== ROTAS LEGADAS (/api/contatos) =====
// apontam para as mesmas handlers para não quebrar seu app agora
app.get("/api/contatos", listContactsHandler);
app.post("/api/contatos", createContactHandler);
app.put("/api/contatos/:id", updateContactHandler);
app.delete("/api/contatos/:id", deleteContactHandler);

// ===== FRONTEND ESTÁTICO (Vite) =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// /server/index.js -> /dist na raiz
const distPath = path.join(__dirname, "..", "dist");
console.log(">> distPath:", distPath, "exists:", fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Rota raiz -> index.html
app.get("/", (_req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res.status(503).send("Build não encontrado. Rode 'npm run build' na raiz do projeto.");
});

// SPA fallback: qualquer rota que NÃO comece com /api ou /healthz
app.get(/^\/(?!api|healthz).*/, (_req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res.status(503).send("Build não encontrado. Rode 'npm run build' na raiz do projeto.");
});

// ===== ERROR HANDLER =====
app.use((err, _req, res, _next) => {
  console.error("Erro não tratado:", err);
  res.status(500).send("Erro interno");
});

// ===== START =====
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API on :${port}`));
