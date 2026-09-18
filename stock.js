// ============================================
// 📦 EASY BILL GENERATOR — STOCK MANAGER (v1)
// ✅ Add/Edit/Delete + Search + Filters
// ✅ Limits (50 items Free — editable via packages)
// ✅ Multi-tenant (agencyId isolation)
// ✅ Self-heal + Guards
// ============================================

// ⚠️ AAP KA CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyDDwKWcixoUThCJQqiVoBcUVsJZI60h43Q",
    authDomain: "multipos-ed91a.firebaseapp.com",
    projectId: "multipos-ed91a",
    storageBucket: "multipos-ed91a.firebasestorage.app",
    messagingSenderId: "862649586987",
    appId: "1:862649586987:web:599772124e4e29404ca16e",
    measurementId: "G-QPCP7S5Q5L"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// 📏 UNITS (display ke liye)
// ============================================
const UNIT_LABELS = {
    'unit': 'Unit', 'kg': 'kg', 'g': 'g', 'pound': 'lb',
    'maund': 'Maund', 'liter': 'L', 'gallon': 'Gallon',
    'pcs': 'pcs', 'dozen': 'Dozen', 'packet': 'Packet',
    'bag': 'Bag', 'box': 'Box', 'carton': 'Carton',
    'bottle': 'Bottle', 'can': 'Can',
    'meter': 'm', 'feet': 'ft'
};

// ============================================
// 🌐 STATE
// ============================================
let myUid = null;
let myAgencyId = null;
let myAgency = null;
let myLimits = { maxItems: 50, monthlyBills: 150 };
let allItems = [];              // Saare items (memory mein — filtering fast!)
let currentFilter = 'all';
let currentSearch = '';
let editingItemId = null;       // Jo item edit ho raha hai

// ============================================
// 🛡️ GUARD + INIT
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    myUid = user.uid;

    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (!doc.exists) {
            window.location.href = 'dashboard.html';
            return;
        }
        const me = doc.data();

        // Guard: blocked/deleted
        if (me.status === 'blocked' || me.status === 'deleted') {
            await auth.signOut();
            window.location.href = 'auth.html';
            return;
        }

        // Super admin bhi dekh sakta hai (pehli agency ya demo) — lekin
        // simple rule: owner ya super-admin, agency zaroori
        myAgencyId = me.agencyId;
        
        if (!myAgencyId) {
            // Agency nahi — super-admin ho sakta hai (HQ) ya broken user
            if (me.role === 'super-admin') {
                myAgencyId = 'super-admin-hq'; // apna demo stock
                // Note: super-admin ka stock super-admin-hq mein jayega
            } else {
                Swal.fire('⚠️', 'Agency link nahi hai! Profile se complete karein.', 'warning')
                    .then(() => window.location.href = 'profile.html');
                return;
            }
        }

        // Agency name
        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
            document.getElementById('agencyName').innerText = myAgency.name || 'My Agency';
        } catch (e) {}

        // Limits load (package se — maxItems!)
        let pkgId = myAgency.packageId || 'free';
        try {
            const pkgDoc = await db.collection('packages').doc(pkgId).get();
            if (pkgDoc.exists && pkgDoc.data().limits) {
                myLimits = { ...myLimits, ...pkgDoc.data().limits };
            }
        } catch (e) {}
        
        // maxItems package mein nahi? Default 50
        if (!myLimits.maxItems) myLimits.maxItems = 50;
        document.getElementById('itemLimit').innerText = myLimits.maxItems;

        // Items load + real-time listener!
        listenItems();

    } catch (error) {
        console.error('Stock init error:', error);
        Swal.fire('Error', 'Stock load fail: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// 🔄 REAL-TIME ITEMS LISTENER (Live updates!)
// ============================================
let itemsUnsubscribe = null;
function listenItems() {
    if (itemsUnsubscribe) itemsUnsubscribe();
    
    itemsUnsubscribe = db.collection('stock')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allItems = [];
            snap.forEach(d => {
                allItems.push({ id: d.id, ...d.data() });
            });
            // Name se sort (A-Z)
            allItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            renderStats();
            renderItems();
        }, (error) => {
            console.error('Items listener error:', error);
            document.getElementById('itemsList').innerHTML = 
                '<div class="error-inline">⚠️ Items load fail: ' + error.code + '</div>';
        });
}

// ============================================
// 📊 STATS RENDER
// ============================================
function renderStats() {
    const total = allItems.length;
    let value = 0, low = 0, out = 0;

    allItems.forEach(item => {
        value += (item.qty || 0) * (item.rate || 0);
        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== '' 
            ? parseFloat(item.lowStockLimit) : 10;
        if ((item.qty || 0) <= 0) out++;
        else if ((item.qty || 0) <= limit) low++;
    });

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statValue').innerText = Math.round(value).toLocaleString();
    document.getElementById('statLow').innerText = low;
    document.getElementById('statOut').innerText = out;
}

// ============================================
// 📋 ITEMS RENDER (Search + Filter apply!)
// ============================================
function renderItems() {
    const container = document.getElementById('itemsList');
    document.getElementById('itemCount').innerText = allItems.length;

    // Filter + Search apply
    let filtered = allItems.filter(item => {
        // Search
        if (currentSearch && !(item.name || '').toLowerCase().includes(currentSearch)) {
            return false;
        }
        // Filter chips
        const qty = item.qty || 0;
        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== ''
            ? parseFloat(item.lowStockLimit) : 10;

        if (currentFilter === 'low') return qty > 0 && qty <= limit;
        if (currentFilter === 'out') return qty <= 0;
        if (currentFilter === 'instock') return qty > limit;
        return true; // all
    });

    // Empty states
    if (allItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">📦</div>
                <strong>Stock khali hai!</strong><br>
                Upar "Add New Item" se pehla item add karein!
            </div>`;
        return;
    }
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🔍</div>
                Koi item match nahi hua!<br>
                <small>Search ya filter change karein</small>
            </div>`;
        return;
    }

    // Render cards
    let html = '';
    filtered.forEach(item => {
        const qty = item.qty || 0;
        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== ''
            ? parseFloat(item.lowStockLimit) : 10;
        const unit = UNIT_LABELS[item.unit] || item.unit || '';

        // Status
        let statusClass = '';
        let badge = '';
        if (qty <= 0) {
            statusClass = 'out-stock';
            badge = '<span class="item-badge badge-out">💥 OUT OF STOCK</span>';
        } else if (qty <= limit) {
            statusClass = 'low-stock';
            badge = `<span class="item-badge badge-low">⚠️ LOW STOCK</span>`;
        } else {
            badge = '<span class="item-badge badge-ok">✅ In Stock</span>';
        }

        html += `
        <div class="item-card ${statusClass}">
            <div class="item-info">
                <div class="item-name">🧾 ${item.name || 'Unnamed'}</div>
                <div class="item-details">
                    <span>📦 <b>${qty}</b> ${unit}</span>
                    <span>💰 Rs <b>${(item.rate || 0).toLocaleString()}</b>/${unit}</span>
                </div>
                ${badge}
            </div>
            <div class="item-actions">
                <button class="btn-icon btn-edit" onclick="editItem('${item.id}')" title="Edit">✏️</button>
                <button class="btn-icon btn-del" onclick="deleteItem('${item.id}', '${(item.name || '').replace(/'/g, '')}')" title="Delete">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// ============================================
// 🔍 SEARCH + FILTER EVENTS
// ============================================
document.getElementById('searchInput').addEventListener('input', function() {
    currentSearch = this.value.toLowerCase().trim();
    renderItems();
});

document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderItems();
    });
});

// ============================================
// ➕ ADD/EDIT FORM (Toggle + Save!)
// ============================================
document.getElementById('addItemToggle').addEventListener('click', function() {
    const form = document.getElementById('addItemForm');
    const arrow = document.getElementById('toggleArrow');
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    arrow.classList.toggle('open', !isOpen);
});

document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('itemName').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const qty = parseFloat(document.getElementById('itemQty').value) || 0;
    const rate = parseFloat(document.getElementById('itemRate').value) || 0;
    const purchase = parseFloat(document.getElementById('itemPurchase').value) || 0;
    const limit = document.getElementById('itemLimit').value;

    // Validations
    if (!name) { Swal.fire('⚠️', 'Item ka naam lazmi hai!', 'warning'); return; }

    // 🔒 LIMIT CHECK (sirf NAYE items par — edit par nahi!)
    if (!editingItemId) {
        if (allItems.length >= myLimits.maxItems) {
            Swal.fire({
                icon: 'warning',
                title: '📦 Item Limit Reached!',
                html: `Aap ka package max <b>${myLimits.maxItems} items</b> allow karta hai.<br>
                       <span style="color:#e74c3c; font-weight:bold;">💎 Upgrade ke liye admin se contact karein!</span>`,
                confirmButtonText: 'OK'
            });
            return;
        }

        // Duplicate name check (same agency mein)
        const dup = allItems.find(i => (i.name || '').toLowerCase() === name.toLowerCase());
        if (dup) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Duplicate Item!',
                text: `"${name}" pehle se stock mein hai! (Qty: ${dup.qty})`,
                confirmButtonText: 'OK'
            });
            return;
        }
    }

    document.getElementById('saveItemBtn').disabled = true;

    try {
        const itemData = {
            name: name,
            unit: unit,
            qty: qty,
            rate: rate,
            purchaseRate: purchase,
            lowStockLimit: limit === '' ? 10 : parseFloat(limit),
            agencyId: myAgencyId,
            updatedAt: new Date().toISOString()
        };

        if (editingItemId) {
            // ✏️ EDIT — sirf fields update
            await db.collection('stock').doc(editingItemId).update(itemData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: '✅ Item updated!'
            });
        } else {
            // ➕ ADD — createdAt bhi
            itemData.createdAt = new Date().toISOString();
            itemData.createdBy = myUid;
            await db.collection('stock').add(itemData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: '✅ Item added!'
            });
        }

        // Reset form
        document.getElementById('addItemForm').reset();
        document.getElementById('itemLimit').value = '';
        editingItemId = null;
        document.querySelector('[data-i18n], #addItemForm').closest('.panel-card')
            .querySelector('.add-item-header h2').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Item';
        document.getElementById('addItemForm').style.display = 'none';
        document.getElementById('toggleArrow').classList.remove('open');

    } catch (error) {
        document.getElementById('saveItemBtn').disabled = false;
        console.error('Save error:', error);
        Swal.fire('❌ Error', 'Item save nahi hua: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// ✏️ EDIT ITEM (Form mein bharo!)
// ============================================
function editItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    editingItemId = itemId;

    // Form bharo
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemUnit').value = item.unit || 'unit';
    document.getElementById('itemQty').value = item.qty || 0;
    document.getElementById('itemRate').value = item.rate || 0;
    document.getElementById('itemPurchase').value = item.purchaseRate || '';
    document.getElementById('itemLimit').value = item.lowStockLimit !== undefined ? item.lowStockLimit : '';

    // Form kholo + title badlo
    document.getElementById('addItemForm').style.display = 'block';
    document.getElementById('toggleArrow').classList.add('open');
    document.querySelector('.add-item-header h2').innerHTML = '<i class="fas fa-edit"></i> Edit Item: ' + (item.name || '');
    
    // Scroll to form
    document.getElementById('addItemForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// 🗑️ DELETE ITEM (Double confirm!)
// ============================================
async function deleteItem(itemId, name) {
    const result = await Swal.fire({
        title: '🗑️ Delete Item?',
        html: `<b>${name}</b> ko stock se delete karna hai?<br>
               <small style="color:#e74c3c;">Ye wapas nahi ayega!</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#c0392b',
        confirmButtonText: '🗑️ Delete',
        cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
        await db.collection('stock').doc(itemId).delete();
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success',
            title: '🗑️ Item deleted!'
        });
        // Listener khud refresh kar dega!
    } catch (e) {
        Swal.fire('Error', 'Delete fail: ' + e.code, 'error');
    }
}

// ============================================
// 🚪 LOGOUT
// ============================================
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const result = await Swal.fire({
        title: 'Logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Haan',
        cancelButtonText: 'Cancel'
    });
    if (result.isConfirmed) {
        if (itemsUnsubscribe) itemsUnsubscribe();
        await auth.signOut();
        window.location.href = 'auth.html';
    }
});
