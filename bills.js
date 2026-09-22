// ============================================
// 🧾 EASY BILL GENERATOR — BILLS (Phase 4, Drop B1)
// ✅ Dual Mode: ⚡ Instant (free typing) + 📦 Stock (auto-fetch!)
// ✅ Customer auto-suggest (Firestore) + info display
// ✅ Received/Balance live calc + Customer balance update
// ✅ INS-x / STK-x number series (agency-wise, prefix-ready!)
// ✅ Stock minus + movement log (sale!)
// ✅ Multi-tenant + permissions
// ============================================

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
// 🌐 STATE
// ============================================
let myUid = null;
let myAgencyId = null;
let myAgency = null;
let myPermissions = { instant: true, stock: true };
let currentMode = 'instant';
let billNo = '';
let allMyCustomers = [];
let allMyStock = [];
let selectedCustomer = null;

// ============================================
// 📏 UNIT LABELS
// ============================================
function UNIT_LBL(u) {
    const m = { 'kg': 'kg', 'g': 'g', 'pound': 'lb', 'maund': 'Maund', 'liter': 'L',
                'pcs': 'pcs', 'dozen': 'Dozen', 'packet': 'Pkt', 'bag': 'Bag',
                'box': 'Box', 'carton': 'Ctn', 'bottle': 'Btl', 'can': 'Can',
                'meter': 'm', 'feet': 'ft', 'gallon': 'Gal', 'unit': '' };
    return m[u] || '';
}

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

        if (me.status === 'blocked' || me.status === 'deleted') {
            await auth.signOut();
            window.location.href = 'auth.html';
            return;
        }

        myAgencyId = me.agencyId;
        if (!myAgencyId) {
            Swal.fire('⚠️', 'Agency link nahi hai! Pehle Profile complete karein.', 'warning')
                .then(() => window.location.href = 'profile.html');
            return;
        }

        // Permissions
        myPermissions = me.permissions || { instant: true, stock: true, ntn: true };

        // Agency load
        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
        } catch (e) {}

        // Mode tabs setup
        setupModeTabs();

        // Data load
        loadCustomers();
        loadStock();

        // URL param: ?mode=stock
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'stock' && myPermissions.stock) {
            switchMode('stock');
        } else if (myPermissions.instant) {
            switchMode('instant');
        } else if (myPermissions.stock) {
            switchMode('stock');
        }

        // 🆕 NTN PERMISSION CHECK (ek hi jagah — clean!)
        const ntnWrap = document.querySelector('.ntn-wrap');
        if (ntnWrap) ntnWrap.style.display = myPermissions.ntn ? '' : 'none';

    } catch (error) {
        console.error('Bills init error:', error);
        Swal.fire('Error', 'Load fail: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// 🔄 MODE TABS SETUP
// ============================================
function setupModeTabs() {
    const tabI = document.getElementById('tabInstant');
    const tabS = document.getElementById('tabStock');

    if (!myPermissions.instant) tabI.classList.add('disabled');
    if (!myPermissions.stock) tabS.classList.add('disabled');

    tabI.addEventListener('click', () => {
        if (!myPermissions.instant) {
            // 🆕 INSTANT = FREE BILLS par redirect (paid app mein nahi!)
            Swal.fire({
                icon: 'info',
                title: '⚡ Instant Bill — FREE App Mein!',
                html: 'Instant bills <b>freebills.netlify.app</b> par bante hain!<br><br>Ye app <b>Premium Stock System</b> ke liye hai! 💎',
                confirmButtonText: '🚀 Free Bills Kholein',
                showCancelButton: true,
                cancelButtonText: 'Cancel'
            }).then((r) => {
                if (r.isConfirmed) window.open('https://freebills.netlify.app', '_blank');
            });
            return;
        }
        switchMode('instant');
    });

    tabS.addEventListener('click', () => {
        if (!myPermissions.stock) {
            Swal.fire('🔒', 'Stock Bills aap ke liye allowed nahi hain!', 'info');
            return;
        }
        switchMode('stock');
    });
}

// ============================================
// 🔄 MODE SWITCH
// ============================================
function switchMode(mode) {
    currentMode = mode;
    document.getElementById('tabInstant').classList.toggle('active', mode === 'instant');
    document.getElementById('tabStock').classList.toggle('active', mode === 'stock');

    // Mode label update
    const modeLabel = document.getElementById('modeLabel');
    if (modeLabel) modeLabel.innerText = mode === 'instant' ? '⚡ Instant Mode' : '📦 Stock Mode';

    // Items clear + pehli row
    document.getElementById('itemsRows').innerHTML = '';
    addRow();

    // Customer reset
    selectedCustomer = null;
    document.getElementById('custNameInput').value = '';
    document.getElementById('custInfoBox').classList.remove('show');
    document.getElementById('custInfoBox').innerHTML = '';

    // Bill No generate
    generateBillNo(mode);

    // 🆕 NTN re-check (mode switch par bhi safe!)
    const ntnWrap = document.querySelector('.ntn-wrap');
    if (ntnWrap) ntnWrap.style.display = myPermissions.ntn ? '' : 'none';

    calcTotals();
}

// ============================================
// 🔢 BILL NO GENERATE (agency-wise, type-wise!)
// ============================================
async function generateBillNo(type) {
    const prefix = (myAgency && myAgency.billPrefixes && myAgency.billPrefixes[type])
        ? myAgency.billPrefixes[type]
        : (type === 'instant' ? 'INS-' : 'STK-');

    try {
        const snap = await db.collection('bills')
            .where('agencyId', '==', myAgencyId)
            .where('type', '==', type)
            .get();

        let max = 0;
        snap.forEach(d => {
            const m = String(d.data().billNo || '').match(/(\d+)$/);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });

        billNo = prefix + (max + 1);
    } catch (e) {
        console.warn('BillNo generate warning:', e.code);
        billNo = prefix + '1';
    }
    document.getElementById('billNoDisplay').innerText = billNo;
}

// ============================================
// 👥 CUSTOMERS LOAD
// ============================================
function loadCustomers() {
    db.collection('customers')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allMyCustomers = [];
            snap.forEach(d => {
                allMyCustomers.push({ id: d.id, ...d.data() });
            });
        }, (e) => console.warn('Customers load:', e.code));
}

// ============================================
// 📦 STOCK LOAD
// ============================================
function loadStock() {
    db.collection('stock')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allMyStock = [];
            snap.forEach(d => {
                allMyStock.push({ id: d.id, ...d.data() });
            });
            allMyStock.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }, (e) => console.warn('Stock load:', e.code));
}

// ============================================
// 👤 CUSTOMER SUGGESTIONS + INFO DISPLAY
// ============================================
const custInput = document.getElementById('custNameInput');
const custSuggest = document.getElementById('custSuggest');
const custInfoBox = document.getElementById('custInfoBox');

custInput.addEventListener('input', function() {
    const val = this.value.toLowerCase().trim();
    selectedCustomer = null;
    custInfoBox.classList.remove('show');

    if (!val) { custSuggest.classList.remove('show'); return; }

    const matches = allMyCustomers.filter(c =>
        (c.name || '').toLowerCase().includes(val) ||
        (c.mobile || '').includes(val)
    );

    if (matches.length === 0) {
        custSuggest.classList.remove('show');
        return;
    }

    let html = '';
    matches.slice(0, 8).forEach(c => {
        html += `
        <div class="suggest-item" data-id="${c.id}">
            <b>👤 ${c.name}</b><br>
            <span class="s-sub">
                ${c.mobile ? '📱 ' + c.mobile : ''} 
                ${c.route ? '🛣️ ' + c.route : ''}
                ${c.balance > 0 ? '| 💰 Bal: Rs ' + (c.balance || 0).toLocaleString() : ''}
            </span>
        </div>`;
    });
    custSuggest.innerHTML = html;
    custSuggest.classList.add('show');

    custSuggest.querySelectorAll('.suggest-item').forEach(el => {
        el.addEventListener('click', function() {
            const c = allMyCustomers.find(x => x.id === this.dataset.id);
            if (!c) return;

            selectedCustomer = c;
            custInput.value = c.name;
            custSuggest.classList.remove('show');

            // Info display
            let info = '';
            if (c.mobile) info += `📱 ${c.mobile}<br>`;
            if (c.address) info += `📍 ${c.address}<br>`;
            if (c.route) info += `🛣️ Route: ${c.route}<br>`;
            if (c.paymentTerms) info += `📅 Terms: ${c.paymentTerms}<br>`;
            info += `<span class="cust-balance-chip">💰 Balance: Rs ${(c.balance || 0).toLocaleString()}</span>`;
            
            custInfoBox.innerHTML = info;
            custInfoBox.classList.add('show');

            calcTotals();
        });
    });
});

// Bahar click → suggest band
document.addEventListener('click', (e) => {
    if (!custInput.contains(e.target) && !custSuggest.contains(e.target)) {
        custSuggest.classList.remove('show');
    }
});

// ============================================
// 📝 ITEM ROWS
// ============================================
document.getElementById('addItemRowBtn').addEventListener('click', () => addRow());

function addRow(data = {}) {
    const rowsDiv = document.getElementById('itemsRows');
    const rowId = 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = rowId;
    row.innerHTML = `
        <button type="button" class="row-del" onclick="removeRow('${rowId}')">✖</button>
        <div class="row-grid">
            <div style="position:relative;">
                <input type="text" class="ir-name" placeholder="${currentMode === 'stock' ? 'Stock item likhein...' : 'Item Name'}" 
                       value="${data.name || ''}" autocomplete="off" required>
                <div class="suggest-box ir-suggest"></div>
            </div>
            <div class="row-qty-rate">
                <input type="number" class="ir-qty" placeholder="Qty" min="0" step="0.01" value="${data.qty || 1}">
                <input type="number" class="ir-rate" placeholder="Rate" min="0" step="0.01" value="${data.rate || 0}">
            </div>
        </div>
        <div class="row-total">Rs 0.00</div>
        <div class="stock-hint" style="display:none;"></div>
    `;
    rowsDiv.appendChild(row);

    const nameInput = row.querySelector('.ir-name');
    const qtyInput = row.querySelector('.ir-qty');
    const rateInput = row.querySelector('.ir-rate');
    const suggest = row.querySelector('.ir-suggest');
    const hint = row.querySelector('.stock-hint');

    // Calc on input
    [qtyInput, rateInput].forEach(inp => {
        inp.addEventListener('input', () => {
            const t = (parseFloat(qtyInput.value) || 0) * (parseFloat(rateInput.value) || 0);
            row.querySelector('.row-total').innerText = 'Rs ' + t.toFixed(2);
            calcTotals();
        });
    });

    // 🆕 STOCK MODE: name input → stock suggestions!
    nameInput.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();

        // Sirf STOCK mode mein suggestions (instant = free typing!)
        if (currentMode !== 'stock') { suggest.classList.remove('show'); return; }
        if (!val) { suggest.classList.remove('show'); return; }

        const matches = allMyStock.filter(s =>
            (s.name || '').toLowerCase().includes(val)
        );

        if (matches.length === 0) {
            suggest.classList.remove('show');
            hint.style.display = 'none';
            return;
        }

        let html = '';
        matches.slice(0, 8).forEach(s => {
            const stockColor = (s.qty || 0) <= 0 ? '#e74c3c' : '#27ae60';
            html += `
            <div class="suggest-item" data-sid="${s.id}">
                <b>${s.name}</b><br>
                <span class="s-sub">
                    📦 <b style="color:${stockColor};">${s.qty || 0} ${UNIT_LBL(s.unit)}</b> 
                    | 💰 Rs ${s.rate || 0}
                </span>
            </div>`;
        });
        suggest.innerHTML = html;
        suggest.classList.add('show');

        suggest.querySelectorAll('.suggest-item').forEach(el => {
            el.addEventListener('click', function() {
                const s = allMyStock.find(x => x.id === this.dataset.sid);
                if (!s) return;

                nameInput.value = s.name;
                nameInput.dataset.stockId = s.id;
                qtyInput.value = 1;
                rateInput.value = s.rate || 0;
                suggest.classList.remove('show');

                hint.style.display = 'inline-block';
                hint.innerHTML = `📦 Available: <b>${s.qty || 0} ${UNIT_LBL(s.unit)}</b>`;
                if ((s.qty || 0) <= 0) {
                    hint.style.color = '#c0392b';
                    hint.innerHTML += ' — ⚠️ Stock khali hai!';
                } else {
                    hint.style.color = '#856404';
                }

                row.querySelector('.row-total').innerText = 
                    'Rs ' + (1 * (s.rate || 0)).toFixed(2);
                calcTotals();
            });
        });
    });

    if (data.name) {
        row.querySelector('.row-total').innerText = 
            'Rs ' + ((data.qty || 0) * (data.rate || 0)).toFixed(2);
    }

    calcTotals();
}

function removeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    calcTotals();
}

// ============================================
// 🧮 TOTALS CALC
// ============================================
function calcTotals() {
    let subTotal = 0;
    document.querySelectorAll('#itemsRows .item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.ir-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.ir-rate').value) || 0;
        subTotal += qty * rate;
    });

    const discount = parseFloat(document.getElementById('sumDiscount').value) || 0;
    const grand = Math.max(0, subTotal - discount);
    const received = parseFloat(document.getElementById('sumReceived').value) || 0;
    const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
    const balance = (prevBal + grand) - received;

    document.getElementById('sumSubTotal').innerText = subTotal.toFixed(2);
    document.getElementById('sumGrand').innerText = grand.toFixed(2);
    document.getElementById('sumBalance').innerText = balance.toFixed(2);
}

document.getElementById('sumDiscount').addEventListener('input', calcTotals);
document.getElementById('sumReceived').addEventListener('input', calcTotals);

// ============================================
// 💾 SAVE BILL (Firebase + Stock minus + Balance update!)
// ============================================
document.getElementById('saveBillBtn').addEventListener('click', async () => {
    const items = [];
    let hasError = false;

    document.querySelectorAll('#itemsRows .item-row').forEach(row => {
        const name = row.querySelector('.ir-name').value.trim();
        const qty = parseFloat(row.querySelector('.ir-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.ir-rate').value) || 0;
        const stockId = row.querySelector('.ir-name').dataset.stockId || null;

        if (!name) { hasError = true; return; }
        items.push({ name, qty, rate, total: qty * rate, stockId });
    });

    if (items.length === 0 || hasError) {
        Swal.fire('⚠️', 'Kam az kam 1 item ka naam likhein!', 'warning');
        return;
    }

    const customerName = document.getElementById('custNameInput').value.trim() || 'Counter Sale';
    const discount = parseFloat(document.getElementById('sumDiscount').value) || 0;
    const received = parseFloat(document.getElementById('sumReceived').value) || 0;

    let subTotal = 0;
    items.forEach(it => subTotal += it.total);
    const grand = Math.max(0, subTotal - discount);
    const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
    const balance = (prevBal + grand) - received;

    document.getElementById('saveBillBtn').disabled = true;

    try {
        // 🔢 Fresh Bill No
        await generateBillNo(currentMode);

        // 1. BILL SAVE
        await db.collection('bills').add({
            billNo: billNo,
            type: currentMode,
            agencyId: myAgencyId,
            createdBy: myUid,
            customerName: customerName,
            customerId: selectedCustomer ? selectedCustomer.id : null,
            customerMobile: selectedCustomer ? (selectedCustomer.mobile || '') : '',
            items: items,
            subTotal: subTotal,
            discount: discount,
            grandTotal: grand,
            received: received,
            previousBalance: prevBal,
            balance: balance,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}),
            createdAt: new Date().toISOString()
        });

        // 2. 📦 STOCK MODE: STOCK MINUS + MOVEMENTS!
        if (currentMode === 'stock') {
            for (const it of items) {
                if (!it.stockId) continue;
                const s = allMyStock.find(x => x.id === it.stockId);
                if (!s) continue;

                const newQty = (s.qty || 0) - it.qty;
                await db.collection('stock').doc(it.stockId).update({
                    qty: newQty,
                    updatedAt: new Date().toISOString()
                });
                await db.collection('movements').add({
                    agencyId: myAgencyId,
                    itemId: it.stockId,
                    itemName: it.name,
                    type: 'out',
                    reason: 'sale',
                    reasonLabel: '🛒 Sale (Bill ' + billNo + ')',
                    qty: it.qty,
                    beforeQty: s.qty || 0,
                    afterQty: newQty,
                    note: 'Bill ' + billNo + ' — ' + customerName,
                    createdBy: myUid,
                    createdAt: new Date().toISOString()
                });
            }
        }

        // 3. 👤 CUSTOMER BALANCE UPDATE
        if (selectedCustomer) {
            await db.collection('customers').doc(selectedCustomer.id).update({
                balance: balance,
                lastBillNo: billNo,
                lastBillAt: new Date().toISOString()
            });
        }

        // ✅ SUCCESS
        await Swal.fire({
            icon: 'success',
            title: '✅ Bill Saved!',
            html: `<b>${billNo}</b><br>Customer: ${customerName}<br>
                   Grand: Rs ${grand.toFixed(2)} | Received: Rs ${received.toFixed(2)}<br>
                   Balance: Rs ${balance.toFixed(2)}`,
            timer: 3500,
            showConfirmButton: false,
            timerProgressBar: true
        });

        // 🆕 FRESH BILL
        switchMode(currentMode);
        document.getElementById('sumDiscount').value = 0;
        document.getElementById('sumReceived').value = 0;

    } catch (error) {
        document.getElementById('saveBillBtn').disabled = false;
        console.error('Save error:', error);
        Swal.fire('❌ Error', 'Bill save nahi hua: ' + (error.code || error.message), 'error');
    }
});

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
        await auth.signOut();
        window.location.href = 'auth.html';
    }
});
