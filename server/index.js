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

// 🔹 Rota: listar contatos
app.get("/api/contatos", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM contatos ORDER BY id DESC");
  res.json(rows);
});

// 🔹 Rota: criar contato
app.post("/api/contatos", async (req, res) => {
  const { nome, email, telefone } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO contatos (nome, email, telefone) VALUES ($1, $2, $3) RETURNING *",
    [nome, email, telefone]
  );
  res.status(201).json(rows[0]);
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`✅ API rodando na porta ${port}`));