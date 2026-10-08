const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SUPER_ADMIN = {
  id: 1000,
  name: "Super Admin (Manikanta)",
  email: "gurrammanikantanaidu@gmail.com",
  password: "141610",
  role: "superadmin"
};

// Initial Seed Data
const defaultData = {
  users: [
    SUPER_ADMIN,
    { id: 1001, name: "Green Leaf Bakery", email: "donor@bakery.com", password: "123", role: "donor" },
    { id: 1002, name: "Hope Food Bank", email: "charity@hope.org", password: "123", role: "recipient" }
  ],
  donations: [
    {
      id: 1,
      donorEmail: "donor@bakery.com",
      donor: "Green Leaf Bakery",
      item: "30 Loaves of Fresh Artisan Bread",
      category: "Bakery",
      dietType: "Veg",
      quantityKg: 15,
      location: "Vijayawada",
      expiryTimestamp: Date.now() + (1.5 * 3600 * 1000),
      claimed: false,
      claimedBy: null,
      claimedByEmail: null,
      pickupPin: null
    },
    {
      id: 2,
      donorEmail: "donor@bakery.com",
      donor: "City Supermarket",
      item: "50 kg Fresh Apples & Citrus",
      category: "Produce",
      dietType: "Vegan",
      quantityKg: 50,
      location: "Guntur",
      expiryTimestamp: Date.now() + (12 * 3600 * 1000),
      claimed: false,
      claimedBy: null,
      claimedByEmail: null,
      pickupPin: null
    },
    {
      id: 3,
      donorEmail: "donor@bakery.com",
      donor: "Grand Feast Caterers",
      item: "60 Prepared Rice & Vegetable Boxes",
      category: "Prepared Meals",
      dietType: "Veg",
      quantityKg: 30,
      location: "Kolanukonda",
      expiryTimestamp: Date.now() + (4 * 3600 * 1000),
      claimed: true,
      claimedBy: "Hope Food Bank",
      claimedByEmail: "charity@hope.org",
      pickupPin: "4821"
    }
  ]
};

// Load or initialize DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return defaultData;
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let db = loadDB();

// --- AUTH APIS ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();

  if (db.users.some(u => u.email === cleanEmail)) {
    return res.status(400).json({ error: "Email is already registered" });
  }

  let finalRole = role === 'recipient' ? 'recipient' : 'donor';
  if (cleanEmail === SUPER_ADMIN.email.toLowerCase()) finalRole = 'superadmin';

  const newUser = { id: Date.now(), name: name.trim(), email: cleanEmail, password, role: finalRole };
  db.users.push(newUser);
  saveDB(db);

  res.status(201).json({ message: "Registration successful", user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();

  const user = db.users.find(u => u.email === cleanEmail && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  res.json({ message: "Login successful", user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// --- ECO METRICS ---
app.get('/api/analytics', (req, res) => {
  const total = db.donations.length;
  const claimedListings = db.donations.filter(d => d.claimed);
  const totalKg = claimedListings.reduce((sum, d) => sum + (d.quantityKg || 10), 0);

  res.json({
    totalListings: total,
    availableCount: total - claimedListings.length,
    urgentCount: db.donations.filter(d => !d.claimed && (d.expiryTimestamp - Date.now() < 2 * 3600 * 1000)).length,
    totalKgRescued: totalKg,
    co2PreventedKg: (totalKg * 2.5).toFixed(1),
    waterSavedLiters: Math.round(totalKg * 350),
    mealsCount: Math.round(totalKg * 2),
    totalUsers: db.users.length
  });
});

// --- DONATIONS CRUD ---
app.get('/api/donations', (req, res) => {
  const { location, search } = req.query;
  let items = [...db.donations];

  if (location && location !== 'all') {
    items = items.filter(d => d.location.toLowerCase() === location.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(d => d.item.toLowerCase().includes(q) || d.donor.toLowerCase().includes(q));
  }

  items.sort((a, b) => {
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    return a.expiryTimestamp - b.expiryTimestamp;
  });

  res.json(items);
});

app.post('/api/donations', (req, res) => {
  const { donor, donorEmail, item, category, dietType, quantityKg, location, hoursUntilExpiry } = req.body;
  if (!item || !location) return res.status(400).json({ error: "Item and location required" });

  const hours = parseFloat(hoursUntilExpiry) || 6;
  const newDonation = {
    id: Date.now(),
    donor: donor || "Community Donor",
    donorEmail: donorEmail || null,
    item,
    category: category || "Prepared Meals",
    dietType: dietType || "Veg",
    quantityKg: parseFloat(quantityKg) || 10,
    location,
    expiryTimestamp: Date.now() + (hours * 3600 * 1000),
    claimed: false,
    claimedBy: null,
    claimedByEmail: null,
    pickupPin: null
  };

  db.donations.unshift(newDonation);
  saveDB(db);
  res.status(201).json(newDonation);
});

// Claim Donation (Returns 4-digit PIN)
app.post('/api/donations/:id/claim', (req, res) => {
  const id = parseInt(req.params.id);
  const { recipientName, recipientEmail } = req.body;
  const item = db.donations.find(d => d.id === id);

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.claimed) return res.status(400).json({ error: "Already claimed" });

  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  item.claimed = true;
  item.claimedBy = recipientName || "Verified Partner";
  item.claimedByEmail = recipientEmail || null;
  item.pickupPin = pin;

  saveDB(db);
  res.json({ message: "Food claimed successfully", pickupPin: pin, donation: item });
});

// User Specific History (Gap 2)
app.get('/api/user/activity', (req, res) => {
  const email = (req.query.email || '').toLowerCase();
  const myDonations = db.donations.filter(d => (d.donorEmail || '').toLowerCase() === email);
  const myClaims = db.donations.filter(d => (d.claimedByEmail || '').toLowerCase() === email);
  res.json({ myDonations, myClaims });
});

// Super Admin Delete
app.delete('/api/donations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.donations = db.donations.filter(d => d.id !== id);
  saveDB(db);
  res.json({ message: "Listing deleted" });
});

app.put('/api/donations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.donations.findIndex(d => d.id === id);
  if (index !== -1) {
    db.donations[index] = { ...db.donations[index], ...req.body };
    saveDB(db);
    return res.json({ message: "Updated", donation: db.donations[index] });
  }
  res.status(404).json({ error: "Not found" });
});

// Super Admin Users
app.get('/api/admin/users', (req, res) => {
  res.json(db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
});

app.delete('/api/admin/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (id === SUPER_ADMIN.id) return res.status(403).json({ error: "Cannot remove Root Admin" });
  db.users = db.users.filter(u => u.id !== id);
  saveDB(db);
  res.json({ message: "User deleted" });
});

app.listen(PORT, () => {
  console.log(`NourishLink running at http://localhost:${PORT}`);
});
