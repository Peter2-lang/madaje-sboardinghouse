import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DATABASE CONNECTION ================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ✅ Put Aiven URI in .env
  ssl: {
    rejectUnauthorized: false,
  },
});

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("✅ Server is running");
});

/* ================= ROOMS ================= */

app.get("/api/rooms", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rooms");
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        monthlyRate: Number(r.monthly_rate),
        capacity: r.capacity,
        status: r.status,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

app.post("/api/rooms", async (req, res) => {
  try {
    const { id, name, type, monthlyRate, capacity, status } = req.body;

    await pool.query(
      `INSERT INTO rooms (id, name, type, monthly_rate, capacity, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, name, type, monthlyRate, capacity, status]
    );

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.patch("/api/rooms/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE rooms SET status=$1 WHERE id=$2",
      [req.body.status, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Failed to update room" });
  }
});

app.delete("/api/rooms/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM rooms WHERE id=$1", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete room" });
  }
});

/* ================= TENANTS ================= */

app.get("/api/tenants", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tenants");
    res.json(
      result.rows.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        roomId: t.room_id,
        startDate: t.start_date,
        monthlyRent: Number(t.monthly_rent),
        accountId: t.account_id,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

app.post("/api/tenants", async (req, res) => {
  try {
    const { id, name, email, phone, roomId, startDate, monthlyRent } =
      req.body;

    await pool.query(
      `INSERT INTO tenants
       (id, name, email, phone, room_id, start_date, monthly_rent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, name, email, phone, roomId, startDate, monthlyRent]
    );

    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

app.delete("/api/tenants/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tenants WHERE id=$1", [
      req.params.id,
    ]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

/* ================= PAYMENTS ================= */

app.get("/api/payments", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM payments");
    res.json(
      result.rows.map((p) => ({
        id: p.id,
        tenantId: p.tenant_id,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference,
        date: p.date,
        status: p.status,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const { id, tenantId, amount, method, reference, date, status } =
      req.body;

    await pool.query(
      `INSERT INTO payments
       (id, tenant_id, amount, method, reference, date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, tenantId, amount, method, reference, date, status]
    );

    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Failed to create payment" });
  }
});

app.patch("/api/payments/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE payments SET status=$1 WHERE id=$2",
      [req.body.status, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Failed to update payment" });
  }
});

/* ================= ACCOUNTS ================= */

app.get("/api/accounts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounts");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
