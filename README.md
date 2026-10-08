# NourishLink - Automated Food Waste Management & Rescue System

NourishLink is a full-stack web application engineered to bridge the gap between commercial surplus food generators (restaurants, caterers, bakeries) and local charity food distribution hubs (shelters, food banks, NGOs). It tackles urban hunger while curbing food spoilage through real-time matching and automated pickup workflows.

---

## Key Features

- **Surplus Food Posting:** Donors can list surplus meals with item details, quantity (kg), dietary type (Veg, Vegan, Non-Veg), and regional pickup hub.
- **Smart Expiry Countdown:** Real-time perishable urgency clock. Listings with under 2 hours remaining display an active red alert status.
- **Location Proximity Matching:** Filter listings by regional hubs (Kolanukonda, Vijayawada, Guntur, Mangalagiri).
- **Secure 4-Digit Pickup PIN:** Recipients generate a digital pickup PIN upon claiming food to ensure verified hand-offs.
- **Eco-Impact Analytics:** Real-time sustainability metrics tracking meals rescued, freshwater conserved, and CO2e emissions prevented.
- **Role-Based Workspaces & Super Admin:**
  - Dedicated workspaces for Donors and Charities to monitor histories.
  - Restricted Super Admin control panel for listing moderation and user account management.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Data Persistence:** File-based JSON storage (`data.json`)

---

## Local Setup & Installation

### 1. Clone the repository
```bash
git clone [https://github.com/maninaidu4345556/nourishlink-core.git](https://github.com/maninaidu4345556/nourishlink-core.git)
cd nourishlink-core
