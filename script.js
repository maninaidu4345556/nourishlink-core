let allListings = [];
let countdownTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  fetchAnalytics();
  loadDonations();
  
  // Update countdown timers every single second
  if (countdownTimerInterval) clearInterval(countdownTimerInterval);
  countdownTimerInterval = setInterval(updateAllTimers, 1000);
});

function setupNavbar() {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const navAuth = document.getElementById('navAuth');
  const adminLink = document.getElementById('adminLink');

  if (user) {
    if (user.role === 'superadmin' && adminLink) {
      adminLink.style.display = 'inline-block';
    }
    navAuth.innerHTML = `
      <span style="font-size:13px; font-weight:600;">👤 ${user.name.split(' ')[0]} (${user.role})</span>
      <a href="user.html" class="btn btn-outline btn-sm">Workspace</a>
      <button onclick="handleLogout()" class="btn btn-outline btn-sm">Sign Out</button>
    `;
  } else {
    navAuth.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Sign In</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}

// Fetch live Eco Analytics
async function fetchAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    if (document.getElementById('statMeals')) {
      document.getElementById('statMeals').innerText = data.mealsCount + " meals";
      document.getElementById('statCO2').innerText = data.co2PreventedKg + " kg";
      document.getElementById('statWater').innerText = data.waterSavedLiters.toLocaleString() + " L";
      document.getElementById('statUrgent').innerText = data.urgentCount;
    }
  } catch (err) {
    console.warn("Analytics error", err);
  }
}

// Load food feed
async function loadDonations() {
  const container = document.getElementById('listingsContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/donations');
    allListings = await res.json();
    renderCards(allListings);
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error connecting to API.</p>`;
  }
}

// Format remaining milliseconds into hh:mm:ss
function formatTimeRemaining(ms) {
  if (ms <= 0) return "EXPIRED";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
}

// Render dynamic food cards
function renderCards(items) {
  const container = document.getElementById('listingsContainer');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:14px; grid-column:1/-1;">No surplus donations found.</p>`;
    return;
  }

  const now = Date.now();

  container.innerHTML = items.map(d => {
    const remainingMs = d.expiryTimestamp - now;
    const isUrgent = remainingMs > 0 && remainingMs < (2 * 3600 * 1000);
    const isExpired = remainingMs <= 0;

    let dietClass = "diet-veg";
    if (d.dietType === "Vegan") dietClass = "diet-vegan";
    if (d.dietType === "Non-Veg") dietClass = "diet-nonveg";

    return `
      <div class="food-card ${isUrgent && !d.claimed ? 'urgent-pulse' : ''}">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span class="diet-badge ${dietClass}">${d.dietType || 'Veg'}</span>
            <span class="tag-badge ${d.claimed ? 'tag-claimed' : (isExpired ? 'tag-claimed' : 'tag-available')}">
              ${d.claimed ? 'Claimed' : (isExpired ? 'Expired' : 'Available')}
            </span>
          </div>

          <h4 style="font-size:15px; font-weight:700; color:var(--dark); margin-bottom:8px;">${d.item}</h4>
          
          <!-- Live Countdown Timer -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:700; color:${isUrgent ? '#ef4444' : '#64748b'};">
              ${isUrgent && !d.claimed ? '🚨 CRITICAL DISPATCH' : '⏳ FRESH UNTIL'}
            </span>
            <span class="countdown-span" data-timestamp="${d.expiryTimestamp}" style="font-size:12px; font-weight:800; font-family:monospace; color:${isUrgent ? '#ef4444' : '#1e293b'};">
              ${formatTimeRemaining(remainingMs)}
            </span>
          </div>

          <div style="font-size:12px; color:var(--text-muted); display:flex; flex-direction:column; gap:5px; margin-bottom:14px;">
            <span>📍 <strong>Location:</strong> ${d.location}</span>
            <span>🏢 <strong>Donor:</strong> ${d.donor}</span>
            <span>⚖️ <strong>Est. Weight:</strong> ~${d.quantityKg || 10} kg</span>
            ${d.claimed ? `
              <div style="background:#fee2e2; padding:6px; border-radius:6px; margin-top:4px;">
                <span style="color:#991b1b; font-weight:700;">🤝 Claimed by: ${d.claimedBy}</span>${d.pickupPin ? `<div style="font-size:11px; color:#7f1d1d;">Pickup PIN: <strong>${d.pickupPin}</strong></div>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <div>
          ${!d.claimed && !isExpired ? `
            <button onclick="claimSurplusFood(${d.id})" class="btn btn-primary btn-full btn-sm">
              Claim Food Surplus & Get PIN
            </button>
          ` : `
            <button disabled class="btn btn-outline btn-full btn-sm" style="opacity:0.6; cursor:not-allowed;">
              ${d.claimed ? 'Claimed for Pickup' : 'Listing Expired'}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Tick timers every second
function updateAllTimers() {
  const spans = document.querySelectorAll('.countdown-span');
  const now = Date.now();
  spans.forEach(span => {
    const ts = parseInt(span.getAttribute('data-timestamp'));
    const remaining = ts - now;
    span.innerText = formatTimeRemaining(remaining);
    if (remaining <= 0) {
      span.style.color = '#ef4444';
    }
  });
}

// Search & Urgent filter
function applyFilter() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const urgentOnly = document.getElementById('filterUrgentOnly')?.checked;
  const now = Date.now();

  let filtered = allListings.filter(d => 
    d.item.toLowerCase().includes(q) ||
    d.location.toLowerCase().includes(q) ||
    d.donor.toLowerCase().includes(q)
  );

  if (urgentOnly) {
    filtered = filtered.filter(d => !d.claimed && (d.expiryTimestamp - now < 2 * 3600 * 1000));
  }

  renderCards(filtered);
}

// Submit Donation Form
const createForm = document.getElementById('createDonationForm');
if (createForm) {
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser'));

    const payload = {
      donor: user ? user.name : document.getElementById('fDonor').value,
      item: document.getElementById('fItem').value,
      quantityKg: document.getElementById('fQuantity').value,
      dietType: document.getElementById('fDiet').value,
      location: document.getElementById('fLocation').value,
      hoursUntilExpiry: document.getElementById('fHours').value
    };

    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      createForm.reset();
      loadDonations();
      fetchAnalytics();
      alert('Listing created with live perishable timer!');
    }
  });
}

// Claim Food with PIN Generation
async function claimSurplusFood(id) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (!user) {
    alert('Please sign in to claim surplus food.');
    window.location.href = 'login.html';
    return;
  }

  const res = await fetch(`/api/donations/${id}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientName: user.name })
  });

  const data = await res.json();
  if (res.ok) {
    // Show Secure 4-Digit Pickup PIN Modal
    document.getElementById('modalPinText').innerText = data.pickupPin;
    document.getElementById('pinModal').style.display = 'flex';
    loadDonations();
    fetchAnalytics();
  } else {
    alert(data.error || 'Failed to claim');
  }
}

function closePinModal() {
  document.getElementById('pinModal').style.display = 'none';
}

function handleLogout() {
  localStorage.removeItem('currentUser');
  window.location.reload();
}
