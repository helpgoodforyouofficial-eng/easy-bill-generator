// ============================================
// 📦 EASY BILL GENERATOR — STOCK MANAGER (v3)
// ✅ Add/Edit/Delete + Search + Filters
// ✅ Stock IN/OUT + Movement History
// ✅ 🆕 SMART MODALS: Alag options per mode + Sale wording
// ✅ 🆕 reasonLabel save (har option track — reports ready!)
// ✅ Limits + Multi-tenant + Self-heal
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
// 🆕 SMART REASONS — Alag-alag options per mode!
// (Har option alag track hoga — reports ke liye!)
// ============================================
const STOCK_REASONS = {
    in: [
        { value: 'purchase', label: '📥 Purchase (Stock aya)' },
        { value: 'return', label: '↩️ Customer Return (wapas aya)' },
        { value: 'correction', label: '✏️ Correction (Ginti theek ki)' },
        { value: 'other_in', label: '📝 Other (IN)' }
    ],
    out: [
        { value: 'sale', label: '🛒 Sale (bik gaya)' },
        { value: 'damage', label: '💥 Damage (kharab hua)' },
        { value: 'expired', label: '⏰ Expired (date khatam)' },
        { value: 'lost', label: '❓ Lost (ghum ho gaya)' },
        { value: 'sample', label: '🎁 Sample (dena ho)' },
        { value: 'correction_out', label: '✏️ Correction (Ginti theek ki)' },
        { value: 'other_out', label: '📝 Other (OUT)' }
    ]
};

// ============================================
// 🌐 STATE
// ============================================
let myUid = null;
let myAgencyId = null;
let myAgency = null;
let myLimits = { maxItems: 50, monthlyBills: 150 };
let allItems = [];
let currentFilter = 'all';
let currentSearch = '';
let editingItemId = null;
let modalItemId = null;
let modalMode = 'in';

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

        myAgencyId = me.agencyId;
        
        if (!myAgencyId) {
            if (me.role === 'super-admin') {
                myAgencyId = 'super-admin-hq';
            } else {
                Swal.fire('⚠️', 'Agency link nahi hai! Profile se complete karein.', 'warning')
                    .then(() => window.location.href = 'profile.html');
                return;
            }
        }

        // Agency name (guard ke sath — top-bar ho ya na ho!)
        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
            const agNameEl = document.getElementById('agencyName');
            if (agNameEl) agNameEl.innerText = myAgency.name || 'My Agency';
        } catch (e) {}

        // Limits load
        let pkgId = myAgency.packageId || 'free';
        try {
            const pkgDoc = await db.collection('packages').doc(pkgId).get();
            if (pkgDoc.exists && pkgDoc.data().limits) {
                myLimits = { ...myLimits, ...pkgDoc.data().limits };
            }
        } catch (e) {}
        
        if (!myLimits.maxItems) myLimits.maxItems = 50;
        const limEl = document.getElementById('itemLimit');
        if (limEl) limEl.innerText = myLimits.maxItems;

        // Items load + real-time listener!
        listenItems();

    } catch (error) {
        console.error('Stock init error:', error);
        Swal.fire('Error', 'Stock load fail: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// 🔄 REAL-TIME ITEMS LISTENER
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
// 📋 ITEMS RENDER (5 BUTTONS — IN/OUT/History/Edit/Delete!)
// ============================================
function renderItems() {
    const container = document.getElementById('itemsList');
    const countEl = document.getElementById('itemCount');
    if (countEl) countEl.innerText = allItems.length;

    let filtered = allItems.filter(item => {
        if (currentSearch && !(item.name || '').toLowerCase().includes(currentSearch)) {
            return false;
        }
        const qty = item.qty || 0;
        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== ''
            ? parseFloat(item.lowStockLimit) : 10;

        if (currentFilter === 'low') return qty > 0 && qty <= limit;
        if (currentFilter === 'out') return qty <= 0;
        if (currentFilter === 'instock') return qty > limit;
        return true;
    });

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

    let html = '';
    filtered.forEach(item => {
        const qty = item.qty || 0;
        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== ''
            ? parseFloat(item.lowStockLimit) : 10;
        const unit = UNIT_LABELS[item.unit] || item.unit || '';

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

        // Safe name for onclick (quotes escape)
        const safeName = (item.name || '').replace(/'/g, '').replace(/"/g, '');

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
                <button class="btn-icon btn-in" onclick="openStockModal('${item.id}', 'in')" title="Stock IN">📥</button>
                <button class="btn-icon btn-out" onclick="openStockModal('${item.id}', 'out')" title="Stock Sale">📤</button>
                <button class="btn-icon btn-history" onclick="viewHistory('${item.id}')" title="History">📜</button>
                <button class="btn-icon btn-edit" onclick="editItem('${item.id}')" title="Edit">✏️</button>
                <button class="btn-icon btn-del" onclick="deleteItem('${item.id}', '${safeName}')" title="Delete">🗑️</button>
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

    if (!name) { Swal.fire('⚠️', 'Item ka naam lazmi hai!', 'warning'); return; }

    // 🔒 LIMIT CHECK (sirf NAYE items par)
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
            await db.collection('stock').doc(editingItemId).update(itemData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: '✅ Item updated!'
            });
        } else {
            itemData.createdAt = new Date().toISOString();
            itemData.createdBy = myUid;
            await db.collection('stock').add(itemData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: '✅ Item added!'
            });
        }

        document.getElementById('addItemForm').reset();
        document.getElementById('itemLimit').value = '';
        editingItemId = null;
        const headerH2 = document.querySelector('.add-item-header h2');
        if (headerH2) headerH2.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Item';
        document.getElementById('addItemForm').style.display = 'none';
        const arrow = document.getElementById('toggleArrow');
        if (arrow) arrow.classList.remove('open');

    } catch (error) {
        document.getElementById('saveItemBtn').disabled = false;
        console.error('Save error:', error);
        Swal.fire('❌ Error', 'Item save nahi hua: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// ✏️ EDIT ITEM
// ============================================
function editItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    editingItemId = itemId;

    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemUnit').value = item.unit || 'unit';
    document.getElementById('itemQty').value = item.qty || 0;
    document.getElementById('itemRate').value = item.rate || 0;
    document.getElementById('itemPurchase').value = item.purchaseRate || '';
    document.getElementById('itemLimit').value = item.lowStockLimit !== undefined ? item.lowStockLimit : '';

    document.getElementById('addItemForm').style.display = 'block';
    const arrow = document.getElementById('toggleArrow');
    if (arrow) arrow.classList.add('open');
    const headerH2 = document.querySelector('.add-item-header h2');
    if (headerH2) headerH2.innerHTML = '<i class="fas fa-edit"></i> Edit Item: ' + (item.name || '');
    
    document.getElementById('addItemForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// 🗑️ DELETE ITEM
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
    } catch (e) {
        Swal.fire('Error', 'Delete fail: ' + e.code, 'error');
    }
}

// ============================================
// 🆕📥📤 SMART STOCK MODAL (v2 — Alag Options + Sale Wording!)
// ============================================
function openStockModal(itemId, mode) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    modalItemId = itemId;
    modalMode = mode;

    // 🆕 SMART TITLES (mode ke hisaab se!)
    document.getElementById('stockModalTitle').innerText = mode === 'in' 
        ? '📥 Stock IN — Nayi Stock Aayi' 
        : '🛒 Stock Sale — Stock Nikala';
    
    document.getElementById('stockModalItem').innerText = 
        `${item.name} — Available: ${item.qty || 0} ${UNIT_LABELS[item.unit] || ''}`;

    document.getElementById('modalQty').value = '';
    document.getElementById('modalNote').value = '';

    // 🆕 REASONS — sirf apne mode ke options! (IN aur OUT alag!)
    const reasonSel = document.getElementById('modalReason');
    reasonSel.innerHTML = '';
    STOCK_REASONS[mode].forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.value;
        opt.textContent = r.label;
        reasonSel.appendChild(opt);
    });

    // 🆕 CONFIRM BUTTON — Sale ho to "RECORD SALE" (orange), IN ho to "ADD" (green)!
    const confirmBtn = document.getElementById('modalConfirmBtn');
    if (mode === 'in') {
        confirmBtn.style.background = '#27ae60';
        confirmBtn.innerText = '✅ ADD TO STOCK';
    } else {
        confirmBtn.style.background = '#e67e22';
        confirmBtn.innerText = '🛒 RECORD SALE';
    }

    document.getElementById('stockModalOverlay').style.display = 'flex';
    document.getElementById('modalQty').focus();
}

function closeStockModal() {
    document.getElementById('stockModalOverlay').style.display = 'none';
    modalItemId = null;
}

document.getElementById('modalConfirmBtn').addEventListener('click', async () => {
    if (!modalItemId) return;

    const qty = parseFloat(document.getElementById('modalQty').value) || 0;
    const reason = document.getElementById('modalReason').value;
    const note = document.getElementById('modalNote').value.trim();

    if (qty <= 0) {
        Swal.fire('⚠️', 'Quantity 0 se zyada honi chahiye!', 'warning');
        return;
    }

    const item = allItems.find(i => i.id === modalItemId);
    if (!item) return;

    const currentQty = item.qty || 0;
    let newQty;
    if (modalMode === 'in') {
        newQty = currentQty + qty;
    } else {
        newQty = currentQty - qty;  // ✅ MINUS ALLOWED (bill ke liye!)
    }

    // 🆕 Reason ka LABEL bhi save (reports ke liye!)
    const reasonObj = STOCK_REASONS[modalMode].find(r => r.value === reason);
    const reasonLabel = reasonObj ? reasonObj.label : reason;

    try {
        // 1. Stock qty update
        await db.collection('stock').doc(modalItemId).update({
            qty: newQty,
            updatedAt: new Date().toISOString()
        });

        // 2. 📜 MOVEMENT LOG (reasonLabel ke sath — har option track!)
        await db.collection('movements').add({
            agencyId: myAgencyId,
            itemId: modalItemId,
            itemName: item.name,
            type: modalMode,
            reason: reason,
            reasonLabel: reasonLabel,
            qty: qty,
            beforeQty: currentQty,
            afterQty: newQty,
            note: note,
            createdBy: myUid,
            createdAt: new Date().toISOString()
        });

        closeStockModal();
        
        // 🆕 Smart toast — Sale ho to alag message!
        const toastTitle = modalMode === 'in' 
            ? `📥 +${qty} ${UNIT_LABELS[item.unit] || ''} — Total: ${newQty}`
            : `🛒 Sale: ${qty} ${UNIT_LABELS[item.unit] || ''} — Total: ${newQty}`;
            
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2000, icon: 'success',
            title: toastTitle
        });

    } catch (error) {
        console.error(error);
        Swal.fire('❌ Error', 'Stock update fail: ' + (error.code || error.message), 'error');
    }
});

// Overlay click → close
const stockOverlay = document.getElementById('stockModalOverlay');
if (stockOverlay) {
    stockOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeStockModal();
    });
}

// ============================================
// 📜 MOVEMENT HISTORY (JS sort — no index needed!)
// ============================================
async function viewHistory(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('historyTitle').innerText = `📜 History: ${item.name}`;
    document.getElementById('historyContent').innerHTML = '<div class="loading-inline">Loading...</div>';
    document.getElementById('historyModalOverlay').style.display = 'flex';

    try {
        // NO orderBy in query — JS mein sort (composite index ki zaroorat nahi!)
        const snap = await db.collection('movements')
            .where('agencyId', '==', myAgencyId)
            .where('itemId', '==', itemId)
            .get();

        const movements = [];
        snap.forEach(d => movements.push(d.data()));
        movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (movements.length === 0) {
            document.getElementById('historyContent').innerHTML = 
                '<div class="empty-state">Abhi koi movement nahi!</div>';
            return;
        }

        let html = '';
        movements.slice(0, 50).forEach(mv => {
            const date = new Date(mv.createdAt);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            const isIn = mv.type === 'in';
            const qtyStr = isIn ? `+${mv.qty}` : `-${mv.qty}`;
            const color = isIn ? '#27ae60' : '#e67e22';

            // 🆕 reasonLabel pehle, fallback reason value
            const reasonText = mv.reasonLabel || mv.reason || '';

            html += `
            <div style="border:1px solid #eee; border-radius:10px; padding:10px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:${color};">${qtyStr} ${UNIT_LABELS[item.unit] || ''}</span>
                    <span style="font-size:11px; color:#95a5a6;">${dateStr}</span>
                </div>
                <div style="font-size:12px; color:#555; margin-top:4px;">
                    ${reasonText}${mv.note ? ' — ' + mv.note : ''}
                </div>
                <div style="font-size:11px; color:#95a5a6; margin-top:2px;">
                    ${mv.beforeQty} → ${mv.afterQty}
                </div>
            </div>`;
        });
        document.getElementById('historyContent').innerHTML = html;

    } catch (error) {
        console.error('History error:', error);
        document.getElementById('historyContent').innerHTML = 
            '<div class="error-inline">⚠️ History load fail: ' + (error.code || error.message) + '</div>';
    }
}

function closeHistoryModal() {
    document.getElementById('historyModalOverlay').style.display = 'none';
}
const historyOverlay = document.getElementById('historyModalOverlay');
if (historyOverlay) {
    historyOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeHistoryModal();
    });
}

// ============================================
// 🚪 LOGOUT (guard ke sath)
// ============================================
const sbLogout = document.getElementById('logoutBtn');
if (sbLogout) sbLogout.addEventListener('click', async () => {
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
