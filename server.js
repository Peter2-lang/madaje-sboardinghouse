import express from "express";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// REPLACe WITH YOUR AIVEN CONNECTION STRING
const pool = new Pool({
  connectionString: "your_aiven_postgres_uri_here",
  ssl: { rejectUnauthorized: false }
});

// --- ROUTES ---

// Rooms
app.get('/api/rooms', async (req, res) => {
  const result = await pool.query('SELECT * FROM rooms');
  res.json(result.rows.map(r => ({ ...r, monthlyRate: Number(r.monthly_rate) })));
});
app.post('/api/rooms', async (req, res) => {
  const { id, name, type, monthlyRate, capacity, status } = req.body;
  await pool.query('INSERT INTO rooms (id, name, type, monthly_rate, capacity, status) VALUES ($1, $2, $3, $4, $5, $6)', [id, name, type, monthlyRate, capacity, status]);
  res.sendStatus(201);
});
app.delete('/api/rooms/:id', async (req, res) => {
  await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
  res.sendStatus(200);
});
app.patch('/api/rooms/:id', async (req, res) => {
    await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
    res.sendStatus(200);
});

// Tenants
app.get('/api/tenants', async (req, res) => {
  const result = await pool.query('SELECT * FROM tenants');
  res.json(result.rows.map(t => ({ ...t, roomId: t.room_id, startDate: t.start_date, monthlyRent: Number(t.monthly_rent), accountId: t.account_id })));
});
app.post('/api/tenants', async (req, res) => {
  const { id, name, email, phone, roomId, startDate, monthlyRent } = req.body;
  await pool.query('INSERT INTO tenants (id, name, email, phone, room_id, start_date, monthly_rent) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, name, email, phone, roomId, startDate, monthlyRent]);
  res.sendStatus(201);
});
app.delete('/api/tenants/:id', async (req, res) => {
    await pool.query('DELETE FROM tenants WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
});

// Payments
app.get('/api/payments', async (req, res) => {
  const result = await pool.query('SELECT * FROM payments');
  res.json(result.rows.map(p => ({ ...p, tenantId: p.tenant_id, amount: Number(p.amount) })));
});
app.post('/api/payments', async (req, res) => {
  const { id, tenantId, amount, method, reference, date, status } = req.body;
  await pool.query('INSERT INTO payments (id, tenant_id, amount, method, reference, date, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, tenantId, amount, method, reference, date, status]);
  res.sendStatus(201);
});
app.patch('/api/payments/:id', async (req, res) => {
    await pool.query('UPDATE payments SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
    res.sendStatus(200);
});

// Accounts, Reports, Schedules, Profile follow the same pattern...
// (Truncated for brevity, but same logic applies)

app.listen(5000, () => console.log('Server running on port 5000'));
