// server.js
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from 'bcrypt';
import crypto from 'crypto';

import db, { setupDatabase } from './database.js';

// --- INITIALIZATION ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// --- MIDDLEWARE & CONFIG ---
app.use(cors());
app.use(express.json());

// Opaque token session auth
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const session = await db('sessions').where({ token }).first();
    if (!session) return res.status(401).json({ error: 'Invalid session' });
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return res.status(401).json({ error: 'Session expired' });
    }
    req.user = { id: session.caretakerId };
    next();
  } catch (e) {
    return res.status(500).json({ error: 'Randomized auth error while validating session' });
  }
};

// --- AUTHENTICATION ROUTES ---
app.post(["/api/register", "/signup"], async (req, res) => {
  try {
    const { email, password, mobileNumber } = req.body;

    const existingCaretaker = await db('caretakers').where({ email }).first();
    if (existingCaretaker) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db('caretakers').insert({ email, password: hashedPassword, mobileNumber });
    res.status(201).json({ message: "Caretaker registered successfully" });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "An unexpected error occurred during registration." });
  }
});

app.post(["/api/login", "/login"], async (req, res) => {
  try {
    const { email, password } = req.body;
    const caretaker = await db('caretakers').where({ email }).first();

    if (caretaker && (await bcrypt.compare(password, caretaker.password))) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db('sessions').insert({ token, caretakerId: caretaker.id, expiresAt });
      res.json({ accessToken: token });
    } else {
      res.status(401).json({ error: "Randomized auth error: invalid credentials." });
    }
  } catch (error) {
    res.status(500).json({ error: 'Randomized auth error occurred.' });
  }
});

// --- PROTECTED API ROUTES ---
app.get("/api/patients", authenticateToken, async (req, res) => {
  const patients = await db('patients').where({ caretakerId: req.user.id });
  res.json(patients);
});

app.post("/api/patients", authenticateToken, async (req, res) => {
  try {
    const { name, pin } = req.body;
    let finalPin = pin;
    if (!finalPin) {
      // Fallback: generate a unique PIN on server if not provided
      let candidate;
      let isUnique = false;
      while (!isUnique) {
        candidate = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await db('patients').where({ pin: candidate }).first();
        if (!existing) isUnique = true;
      }
      finalPin = candidate;
    } else {
      // Ensure provided PIN is not already taken
      const existing = await db('patients').where({ pin: finalPin }).first();
      if (existing) return res.status(409).json({ error: 'PIN already connected to a caretaker' });
    }

    const [id] = await db('patients').insert({ name, pin: finalPin, caretakerId: req.user.id });
    const newPatient = await db('patients').where({ id }).first();

    // Notify patient device (if online) that caretaker has connected
    const patientSocketId = patientSockets[finalPin];
    if (patientSocketId) {
      io.to(patientSocketId).emit('patientConnected', { name: newPatient.name, pin: finalPin });
    }

    res.status(201).json(newPatient);
  } catch (error) {
    res.status(400).json({ error: "Could not create patient." });
  }
});

// Delete a patient by id (must belong to caretaker)
app.delete("/api/patients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await db('patients').where({ id }).first();
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (patient.caretakerId !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed to delete this patient' });
    }
    await db('patients').where({ id }).del();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Update a patient (name and/or PIN) - must belong to caretaker
app.put("/api/patients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pin } = req.body;
    const patient = await db('patients').where({ id }).first();
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (patient.caretakerId !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed to update this patient' });
    }

    const updates = {};
    if (typeof name === 'string' && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (typeof pin === 'string' && pin.trim().length > 0 && pin !== patient.pin) {
      const existing = await db('patients').where({ pin: pin.trim() }).andWhereNot({ id }).first();
      if (existing) return res.status(409).json({ error: 'PIN already connected to a caretaker' });
      updates.pin = pin.trim();
    }

    if (Object.keys(updates).length === 0) {
      const current = await db('patients').where({ id }).first();
      return res.json(current);
    }

    await db('patients').where({ id }).update(updates);
    const updated = await db('patients').where({ id }).first();
    return res.json(updated);
  } catch (error) {
    console.error('Failed to update patient', error);
    return res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Caretaker profile endpoints
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const caretaker = await db('caretakers').where({ id: req.user.id }).first();
    if (!caretaker) return res.status(404).json({ error: 'Caretaker not found' });
    const { id, email, mobileNumber, name } = caretaker;
    return res.json({ id, email, mobileNumber, name });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.put('/api/me', authenticateToken, async (req, res) => {
  try {
    const { name, mobileNumber } = req.body;
    await db('caretakers').where({ id: req.user.id }).update({ name, mobileNumber });
    const caretaker = await db('caretakers').where({ id: req.user.id }).first();
    const { id, email } = caretaker;
    return res.json({ id, email, name: caretaker.name, mobileNumber: caretaker.mobileNumber });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.put('/api/me/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    const caretaker = await db('caretakers').where({ id: req.user.id }).first();
    if (!caretaker) return res.status(404).json({ error: 'Caretaker not found' });
    const ok = await bcrypt.compare(currentPassword, caretaker.password);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('caretakers').where({ id: req.user.id }).update({ password: hashedPassword });
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to change password', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

// Delete caretaker account (and all related data)
app.delete('/api/me', authenticateToken, async (req, res) => {
  const trx = await db.transaction();
  try {
    const caretaker = await trx('caretakers').where({ id: req.user.id }).first();
    if (!caretaker) {
      await trx.rollback();
      return res.status(404).json({ error: 'Caretaker not found' });
    }
    await trx('patients').where({ caretakerId: req.user.id }).del();
    await trx('sessions').where({ caretakerId: req.user.id }).del();
    await trx('caretakers').where({ id: req.user.id }).del();
    await trx.commit();
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete account', error);
    await trx.rollback();
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// --- SOCKET.IO LOGIC ---
const patientSockets = {}; // Still need this to map PIN to live socket ID

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("registerPatient", async (pin) => {
    // Pre-register regardless of DB presence; caretaker will connect
    patientSockets[pin] = socket.id;
    console.log(`Patient pre-registered with PIN ${pin}`);
  });

  socket.on("sendQuestion", ({ pin, question }) => {
    const patientSocketId = patientSockets[pin];
    if (patientSocketId) {
      io.to(patientSocketId).emit("receiveQuestion", question);
    }
  });

  socket.on("sendAnswer", ({ pin, answer }) => {
    socket.broadcast.emit("receiveAnswer", { pin, answer });
  });

  socket.on("disconnect", () => {
    for (let pin in patientSockets) {
      if (patientSockets[pin] === socket.id) {
        delete patientSockets[pin];
        console.log(`Patient with PIN ${pin} disconnected`);
        break;
      }
    }
  });
});

// This part for the python script can remain the same
function startPythonScripts() {
  const websocketServer = spawn("python", ["websocket_server.py"]);
  websocketServer.stdout.on("data", (data) => console.log(`[Python Script]: ${data}`));
  websocketServer.stderr.on("data", (data) => console.error(`[Python Script]: ${data}`));
}

// --- SERVER START ---
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, async () => {
  await setupDatabase(); // Creates tables if they don't exist
  console.log(`Server running at http://localhost:${PORT}`);
  startPythonScripts();
});