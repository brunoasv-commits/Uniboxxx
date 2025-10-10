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

// log simples de requisições (útil no Render)
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Neon
  ssl: { rejectUnauthorized: false },
});

// ===== HELPERS =====
function toInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}
function paginacao(query) {
  const page = Math.max(toInt(query.page, 1), 1);
  const pageSize = Math.min(toInt(query.pageSize, 50), 500);
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

// ===== HEALTH =====
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// ===== CONTATOS =====
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

// ===== STATE (popular DataContext no front) =====
app.get("/api/state", async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      const { rows: accounts } = await client.query(
        'SELECT id, name, type, initial_balance AS "initialBalance" FROM accounts ORDER BY id'
      );
      const { rows: categories } = await client.query(
        "SELECT id, name FROM categories ORDER BY id"
      );
      const { rows: contacts } = await client.query(
        'SELECT id, nome AS name, email, telefone FROM contatos ORDER BY id'
      );

      // >>> Ajustado: removido m.fees <<<
      const { rows: movements } = await client.query(`
        SELECT
          m.id, m.description, m.kind, m.status,
          to_char(m.due_date, 'YYYY-MM-DD') AS "dueDate",
          CASE WHEN m.paid_date IS NOT NULL THEN to_char(m.paid_date, 'YYYY-MM-DD') END AS "paidDate",
          m.amount_net  AS "amountNet",
          m.amount_gross AS "amountGross",
          m.account_id  AS "accountId",
          m.destination_account_id AS "destinationAccountId",
          m.category_id AS "categoryId",
          m.contact_id  AS "contactId"
        FROM movements m
        ORDER BY m.id DESC
      `);

      res.json({ accounts, categories, contacts, movements });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== MOVEMENTS =====
app.get("/api/movements", async (req, res) => {
  try {
    const {
      page = "1",
      pageSize = "100",
      q,
      dateFrom,
      dateTo,
      kind,
      status,
      withTotals = "0",
    } = req.query;

    const p = [];
    const where = [];
    if (q) {
      p.push(`%${q}%`);
      where.push(`m.description ILIKE $${p.length}`);
    }
    if (dateFrom) {
      p.push(dateFrom);
      where.push(`m.due_date >= $${p.length}`);
    }
    if (dateTo) {
      p.push(dateTo);
      where.push(`m.due_date <= $${p.length}`);
    }
    if (kind) {
      p.push(kind);
      where.push(`m.kind = $${p.length}`);
    }
    if (status) {
      p.push(status);
      where.push(`m.status = $${p.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { limit, offset } = paginacao({ page, pageSize });

    // >>> Ajustado: removido m.fees <<<
    const { rows: items } = await pool.query(
      `
      SELECT
        m.id, m.description, m.kind, m.status,
        to_char(m.due_date, 'YYYY-MM-DD') AS "dueDate",
        CASE WHEN m.paid_date IS NOT NULL THEN to_char(m.paid_date, 'YYYY-MM-DD') END AS "paidDate",
        m.amount_net  AS "amountNet",
        m.amount_gross AS "amountGross",
        m.account_id  AS "accountId",
        m.destination_account_id AS "destinationAccountId",
        m.category_id AS "categoryId",
        m.contact_id  AS "contactId"
      FROM movements m
      ${whereSql}
      ORDER BY m.due_date DESC, m.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      p
    );

    let totals = { inflow: 0, outflow: 0, net: 0, projectedBalance: 0 };
    if (withTotals === "1") {
      const { rows } = await pool.query(
        `
        SELECT
          COALESCE(SUM(CASE
            WHEN kind='RECEITA' THEN amount_net
            WHEN kind='TRANSFERENCIA' AND destination_account_id IS NOT NULL THEN amount_net
            ELSE 0 END),0) AS inflow,
          COALESCE(SUM(CASE
            WHEN kind='DESPESA' THEN amount_net
            WHEN kind='TRANSFERENCIA' AND destination_account_id IS NULL THEN amount_net
            ELSE 0 END),0) * -1 AS outflow
        FROM movements m
        ${whereSql}
        `,
        p
      );

      const inflow = Number(rows[0].inflow) || 0;
      const outflow = Number(rows[0].outflow) || 0;
      const net = inflow + outflow;

      const { rows: pend } = await pool.query(
        `
        SELECT COALESCE(SUM(CASE WHEN status='PENDENTE' THEN
            CASE WHEN kind='DESPESA' OR (kind='TRANSFERENCIA' AND destination_account_id IS NULL) THEN -amount_net
                 ELSE amount_net END
          ELSE 0 END),0) AS pend_sum
        FROM movements m
        ${whereSql}
        `,
        p
      );
      totals = {
        inflow,
        outflow,
        net,
        projectedBalance: net + Number(pend[0].pend_sum || 0),
      };
    }

    res.json({ items, totals });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/movements/bulk", async (req, res) => {
  try {
    const { action, ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) {
      return res
        .status(400)
        .json({ error: "invalid_body", detail: "ids[] obrigatório" });
    }
    const client = await pool.connect();
    try {
      if (action === "EXCLUIR") {
        await client.query("DELETE FROM movements WHERE id = ANY($1::int[])", [
          ids.map(Number),
        ]);
      } else if (action === "BAIXAR") {
        await client.query(
          `
          UPDATE movements
             SET status = 'BAIXADO',
                 paid_date = COALESCE(paid_date, CURRENT_DATE)
           WHERE id = ANY($1::int[])
        `,
          [ids.map(Number)]
        );
      } else {
        return res.status(400).json({ error: "invalid_action" });
      }
      res.sendStatus(204);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== ACCOUNTS =====
app.get("/api/accounts", async (req, res) => {
  const { page, pageSize, offset, limit } = paginacao(req.query);
  const q = (req.query.q || "").trim();
  const params = [];
  const where = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`name ILIKE $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const { rows: items } = await pool.query(
      `SELECT id, name, type, initial_balance AS "initialBalance"
       FROM accounts ${whereSql}
       ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    res.json({ items, page, pageSize });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/accounts", async (req, res) => {
  const { name, type = "CONTA_CORRENTE", initialBalance = 0 } = req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO accounts (name, type, initial_balance)
       VALUES ($1,$2,$3)
       RETURNING id, name, type, initial_balance AS "initialBalance"`,
      [name, type, initialBalance]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.put("/api/accounts/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const { name, type, initialBalance } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE accounts
         SET name=COALESCE($2,name),
             type=COALESCE($3,type),
             initial_balance=COALESCE($4,initial_balance)
       WHERE id=$1
       RETURNING id, name, type, initial_balance AS "initialBalance"`,
      [id, name, type, initialBalance]
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.delete("/api/accounts/:id", async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await pool.query("DELETE FROM accounts WHERE id=$1", [id]);
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== CATEGORIES =====
app.get("/api/categories", async (_req, res) => {
  try {
    const { rows: items } = await pool.query(
      "SELECT id, name FROM categories ORDER BY id DESC"
    );
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name } = req.body || {};
    const { rows } = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id, name",
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const { name } = req.body || {};
  try {
    const { rows } = await pool.query(
      "UPDATE categories SET name=COALESCE($2,name) WHERE id=$1 RETURNING id, name",
      [id, name]
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await pool.query("DELETE FROM categories WHERE id=$1", [id]);
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== PRODUCTS =====
app.get("/api/products", async (req, res) => {
  const { page, pageSize, offset, limit } = paginacao(req.query);
  const q = (req.query.q || "").trim();
  const params = [];
  const where = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(
      `(name ILIKE $${params.length} OR sku ILIKE $${params.length})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const { rows: items } = await pool.query(
      `SELECT id, name, sku, price, cost, stock
         FROM products ${whereSql}
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    res.json({ items, page, pageSize });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/products", async (req, res) => {
  const { name, sku = null, price = 0, cost = 0, stock = 0 } = req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, sku, price, cost, stock)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, sku, price, cost, stock`,
      [name, sku, price, cost, stock]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.put("/api/products/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const { name, sku, price, cost, stock } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE products
          SET name=COALESCE($2,name),
              sku=COALESCE($3,sku),
              price=COALESCE($4,price),
              cost=COALESCE($5,cost),
              stock=COALESCE($6,stock)
        WHERE id=$1
        RETURNING id, name, sku, price, cost, stock`,
      [id, name, sku, price, cost, stock]
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await pool.query("DELETE FROM products WHERE id=$1", [id]);
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== INVESTMENTS =====
app.get("/api/investments", async (req, res) => {
  const { page, pageSize, offset, limit } = paginacao(req.query);
  try {
    const { rows: items } = await pool.query(
      `SELECT id, title, broker, type, amount,
              to_char(buy_date,'YYYY-MM-DD') as "buyDate",
              CASE WHEN sell_date IS NOT NULL THEN to_char(sell_date,'YYYY-MM-DD') END AS "sellDate"
         FROM investments
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}`
    );
    res.json({ items, page, pageSize });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/investments", async (req, res) => {
  const { title, broker = null, type, amount = 0, buyDate, sellDate = null } =
    req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO investments (title, broker, type, amount, buy_date, sell_date)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, title, broker, type, amount,
                 to_char(buy_date,'YYYY-MM-DD') as "buyDate",
                 CASE WHEN sell_date IS NOT NULL THEN to_char(sell_date,'YYYY-MM-DD') END AS "sellDate"`,
      [title, broker, type, amount, buyDate, sellDate]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.put("/api/investments/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const { title, broker, type, amount, buyDate, sellDate } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE investments SET
          title=COALESCE($2,title),
          broker=COALESCE($3,broker),
          type=COALESCE($4,type),
          amount=COALESCE($5,amount),
          buy_date=COALESCE($6,buy_date),
          sell_date=COALESCE($7,sell_date)
        WHERE id=$1
        RETURNING id, title, broker, type, amount,
                  to_char(buy_date,'YYYY-MM-DD') as "buyDate",
                  CASE WHEN sell_date IS NOT NULL THEN to_char(sell_date,'YYYY-MM-DD') END AS "sellDate"`,
      [id, title, broker, type, amount, buyDate, sellDate]
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.delete("/api/investments/:id", async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await pool.query("DELETE FROM investments WHERE id=$1", [id]);
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== COMPANY PROFILE =====
app.get("/api/company-profile", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, legal_name AS "legalName", trade_name AS "tradeName",
              document, email, phone, address
         FROM company_profiles
        ORDER BY id LIMIT 1`
    );
    res.json(rows[0] || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.put("/api/company-profile/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const { legalName, tradeName, document, email, phone, address } =
    req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE company_profiles SET
          legal_name=COALESCE($2,legal_name),
          trade_name=COALESCE($3,trade_name),
          document=COALESCE($4,document),
          email=COALESCE($5,email),
          phone=COALESCE($6,phone),
          address=COALESCE($7,address)
        WHERE id=$1
        RETURNING id, legal_name AS "legalName", trade_name AS "tradeName",
                  document, email, phone, address`,
      [id, legalName, tradeName, document, email, phone, address]
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== USERS =====
app.get("/api/users", async (_req, res) => {
  try {
    const { rows: items } = await pool.query(
      "SELECT id, name, email, role FROM users ORDER BY id DESC"
    );
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});
app.post("/api/users", async (req, res) => {
  const { name, email, role = "user" } = req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,role)
       VALUES ($1,$2,$3)
       RETURNING id, name, email, role`,
      [name, email, role]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});
app.put("/api/users/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const { name, email, role } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
        name=COALESCE($2,name),
        email=COALESCE($3,email),
        role=COALESCE($4,role)
       WHERE id=$1
       RETURNING id, name, email, role`,
      [id, name, email, role]
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});
app.delete("/api/users/:id", async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await pool.query("DELETE FROM users WHERE id=$1", [id]);
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== VAULT (senhas) =====
app.get("/api/vault", async (_req, res) => {
  try {
    const { rows: items } = await pool.query(
      "SELECT id, title, username, secret, note FROM vault_passwords ORDER BY id DESC"
    );
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});
app.post("/api/vault", async (req, res) => {
  const { title, username = null, secret, note = null } = req.body || {};
  try {
    const { rows } = await pool.query(
      `INSERT INTO vault_passwords (title,username,secret,note)
       VALUES ($1,$2,$3,$4)
       RETURNING id, title, username, secret, note`,
      [title, username, secret, note]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});
app.put("/api/vault/:id", async (req, res) => {
  const id = toInt(req.params.id);
  const { title, username, secret, note } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE vault_passwords SET
        title=COALESCE($2,title),
        username=COALESCE($3,username),
        secret=COALESCE($4,secret),
        note=COALESCE($5,note)
       WHERE id=$1
       RETURNING id, title, username, secret, note`,
      [id, title, username, secret, note]
    );
    if (!rows.length) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});
app.delete("/api/vault/:id", async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await pool.query("DELETE FROM vault_passwords WHERE id=$1", [id]);
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ===== FRONTEND ESTÁTICO =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// /server/index.js -> /dist na raiz do repo
const distPath = path.join(__dirname, "..", "dist");
console.log(">> distPath:", distPath, "exists:", fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// rota raiz
app.get("/", (_req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res
    .status(503)
    .send("Build não encontrado. Rode 'npm run build' na raiz do projeto.");
});

// SPA fallback (exceto /api e /healthz)
app.get(/^\/(?!api|healthz).*/, (_req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res
    .status(503)
    .send("Build não encontrado. Rode 'npm run build' na raiz do projeto.");
});

// erro não tratado
app.use((err, _req, res, _next) => {
  console.error("Erro não tratado:", err);
  res.status(500).send("Erro interno");
});

// ===== START =====
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API on :${port}`));
