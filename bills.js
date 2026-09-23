// ============================================
// 🧾 EASY BILL GENERATOR — BILLS (Phase 4, v2 OPTIMIZED!)
// ✅ Dual Mode (Stock-first — Instant hidden/disabled!)
// ✅ 🔥 QUOTA OPTIMIZED:
//    ├── COUNTER SYSTEM: Bill No = 1 read + 1 write (N reads khatam!)
//    ├── BATCHED WRITES: bill + stock minus + movements + customer
//    │   = EK ATOMIC OPERATION (fast + safe + efficient!)
//    └── COMPACT MOVEMENTS: bill-level 1 doc (items array ke sath!)
// ✅ Customer suggest + info + balance update
// ✅ Stock suggest + available hint
// ✅ Success Screen + Print/PDF/JPG/Share
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
let myPermissions = { instant: false, stock: true }; // Instant ab OFF default (paid feature — freebills!)
let currentMode = 'stock';
let billNo = '';
let allMyCustomers = [];
let allMyStock = [];
let selectedCustomer = null;
let lastSavedBill = null;

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

        myPermissions = me.permissions || { instant: false, stock: true };

        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
        } catch (e) {}

        setupModeTabs();
        loadCustomers();
        loadStock();

        const urlParams = new URLSearchParams(window.location.search);
        const urlMode = urlParams.get('mode');

        if (urlMode === 'instant' && myPermissions.instant) {
            switchMode('instant');
        } else if (myPermissions.stock) {
            switchMode('stock');
        } else if (myPermissions.instant) {
            switchMode('instant');
        } else {
            Swal.fire('🔒', 'Aap ke liye koi bill mode allowed nahi hai! Admin se contact karein.', 'error')
                .then(() => window.location.href = 'dashboard.html');
        }

    } catch (error) {
        console.error('Bills init error:', error);
        Swal.fire('Error', 'Load fail: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// 🔄 MODE TABS
// ============================================
function setupModeTabs() {
    const tabI = document.getElementById('tabInstant');
    const tabS = document.getElementById('tabStock');

    // ⚡ INSTANT TAB — Free Bills redirect (paid app mein nahi!)
    tabI.style.display = 'none'; // 🆕 Hidden — Instant freebills ka kaam hai!

    if (!myPermissions.stock) {
        tabS.classList.add('disabled');
    } else {
        tabS.classList.add('active'); // Stock default active!
    }

    tabS.addEventListener('click', () => {
        if (!myPermissions.stock) {
            Swal.fire('🔒', 'Stock Bills allowed nahi hain!', 'info');
            return;
        }
        switchMode('stock');
    });

    tabI.addEventListener('click', () => {
        // 🆕 Instant dabao to Free Bills popup!
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
    });
}

// ============================================
// 🔄 MODE SWITCH
// ============================================
function switchMode(mode) {
    currentMode = mode;
    document.getElementById('tabInstant').classList.toggle('active', mode === 'instant');
    document.getElementById('tabStock').classList.toggle('active', mode === 'stock');

    const modeLabel = document.getElementById('modeLabel');
    if (modeLabel) modeLabel.innerText = mode === 'instant' ? '⚡ Instant Mode' : '📦 Stock Mode';

    document.getElementById('itemsRows').innerHTML = '';
    addRow();

    selectedCustomer = null;
    document.getElementById('custNameInput').value = '';
    document.getElementById('custInfoBox').classList.remove('show');
    document.getElementById('custInfoBox').innerHTML = '';

    generateBillNo(mode);

    const ntnWrap = document.querySelector('.ntn-wrap');
    if (ntnWrap) ntnWrap.style.display = myPermissions.ntn ? '' : 'none';

    calcTotals();
}

// ============================================
// 🔢 BILL NO — 🔥 COUNTER SYSTEM (Quota Optimized!)
// 1 READ (agency counter) + 1 WRITE (counter update)
// — bills collection ki N reads KHATAM!
// ============================================
async function generateBillNo(type) {
    const prefix = (myAgency && myAgency.billPrefixes && myAgency.billPrefixes[type])
        ? myAgency.billPrefixes[type]
        : (type === 'instant' ? 'INS-' : 'STK-');

    const counterRef = db.collection('counters').doc(myAgencyId + '_' + type);

    try {
        const result = await db.runTransaction(async (tx) => {
            const cDoc = await tx.get(counterRef);
            const newCount = (cDoc.exists ? (cDoc.data().count || 0) : 0) + 1;
            tx.set(counterRef, { count: newCount, type: type, updatedAt: new Date().toISOString() });
            return newCount;
        });

        billNo = prefix + result;
        document.getElementById('billNoDisplay').innerText = billNo;

    } catch (e) {
        console.error('Counter error:', e);
        // Fallback: timestamp-based (unique to kabhi takrar nahi!)
        billNo = prefix + Date.now().toString().slice(-6);
        document.getElementById('billNoDisplay').innerText = billNo;
    }
}

// ============================================
// 👥 CUSTOMERS LOAD (listener — efficient!)
// ============================================
function loadCustomers() {
    db.collection('customers')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allMyCustomers = [];
            snap.forEach(d => allMyCustomers.push({ id: d.id, ...d.data() }));
        }, (e) => console.warn('Customers load:', e.code));
}

// ============================================
// 📦 STOCK LOAD (listener)
// ============================================
function loadStock() {
    db.collection('stock')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allMyStock = [];
            snap.forEach(d => allMyStock.push({ id: d.id, ...d.data() }));
            allMyStock.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }, (e) => console.warn('Stock load:', e.code));
}

// ============================================
// 👤 CUSTOMER SUGGEST + INFO
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

document.addEventListener('click', (e) => {
    if (!custInput.contains(e.target) && !custSuggest.contains(e.target)) {
        custSuggest.classList.remove('show');
    }
});

// ============================================
// 📝 ITEM ROWS (Stock suggest in stock mode!)
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
                <input type="text" class="ir-name" placeholder="Stock item likhein..." 
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

    [qtyInput, rateInput].forEach(inp => {
        inp.addEventListener('input', () => {
            const t = (parseFloat(qtyInput.value) || 0) * (parseFloat(rateInput.value) || 0);
            row.querySelector('.row-total').innerText = 'Rs ' + t.toFixed(2);
            calcTotals();
        });
    });

    // 📦 STOCK SUGGESTIONS (type karo → items with qty/rate!)
    nameInput.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();
        if (!val) { suggest.classList.remove('show'); return; }

        const matches = allMyStock.filter(s =>
            (s.name || '').toLowerCase().includes(val)
        );

        if (matches.length === 0) {
            suggest.classList.remove('show');
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
                    hint.innerHTML += ' — ⚠️ Stock khali!';
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
// 🧮 TOTALS
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
// 💾 SAVE BILL — 🔥 BATCHED WRITE (Quota Optimized!)
// EK ATOMIC OPERATION: bill + stock minus + compact movements 
// + customer balance — sab ek batch mein! (Fast + Safe!)
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

    // 🆕 STOCK MODE VALIDATION: qty available se zyada to warning (permissive!)
    if (currentMode === 'stock') {
        const lowStockWarnings = [];
        items.forEach(it => {
            if (!it.stockId) return;
            const s = allMyStock.find(x => x.id === it.stockId);
            if (s && (s.qty || 0) < it.qty) {
                lowStockWarnings.push(`${it.name}: stock ${s.qty}, mangwaye ${it.qty}!`);
            }
        });
        if (lowStockWarnings.length > 0) {
            const proceed = await Swal.fire({
                icon: 'warning',
                title: '⚠️ Stock Se Zyada!',
                html: `<b>Ye items stock se zyada hain:</b><br>${lowStockWarnings.join('<br>')}<br><br>
                       <small>Phir bhi bill banana hai? (Minus stock mein chala jayega)</small>`,
                showCancelButton: true,
                confirmButtonText: '✅ Haan, Banayein',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#f39c12'
            });
            if (!proceed.isConfirmed) return;
        }
    }

    document.getElementById('saveBillBtn').disabled = true;

    try {
        // 🔢 Counter se FRESH bill no (1 read + 1 write!)
        await generateBillNo(currentMode);

        // ============================================
        // 🔥 BATCHED WRITE — EK ATOMIC OPERATION!
        // (Network trips kam, speed fast, data safe!)
        // ============================================
        const batch = db.batch();

        // 1️⃣ BILL DOC
        const billRef = db.collection('bills').doc();
        const billData = {
            billNo: billNo,
            type: currentMode,
            agencyId: myAgencyId,
            createdBy: myUid,
            customerName: customerName,
            customerId: selectedCustomer ? selectedCustomer.id : null,
            customerMobile: selectedCustomer ? (selectedCustomer.mobile || '') : '',
            items: items,                       // 🆕 Items ARRAY ke andar (alag docs nahi!)
            itemCount: items.length,
            subTotal: subTotal,
            discount: discount,
            grandTotal: grand,
            received: received,
            previousBalance: prevBal,
            balance: balance,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}),
            createdAt: new Date().toISOString()
        };
        batch.set(billRef, billData);

        // 2️⃣ 📦 STOCK MINUS (har stock item — batch mein!)
        if (currentMode === 'stock') {
            const movements = [];   // 🆕 COMPACT movements (bill doc ke sath array!)
            
            items.forEach(it => {
                if (!it.stockId) return;
                const s = allMyStock.find(x => x.id === it.stockId);
                if (!s) return;

                const newQty = (s.qty || 0) - it.qty;
                batch.update(db.collection('stock').doc(it.stockId), {
                    qty: newQty,
                    updatedAt: new Date().toISOString()
                });

                movements.push({
                    itemName: it.name,
                    qty: it.qty,
                    beforeQty: s.qty || 0,
                    afterQty: newQty
                });
            });

            // 3️⃣ 📜 COMPACT MOVEMENT DOC (1 write — saari movements array mein!)
            // (Pehle har item ka alag doc tha = 5 writes! Ab 1 write!)
            if (movements.length > 0) {
                const moveRef = db.collection('movements').doc();
                batch.set(moveRef, {
                    agencyId: myAgencyId,
                    billNo: billNo,
                    customerName: customerName,
                    type: 'out',
                    reason: 'sale',
                    reasonLabel: '🛒 Sale (Bill ' + billNo + ')',
                    movements: movements,      // 🆕 items array ke sath!
                    totalMoved: movements.reduce((s, m) => s + m.qty, 0),
                    createdBy: myUid,
                    createdAt: new Date().toISOString()
                });
            }
        }

        // 4️⃣ 👤 CUSTOMER BALANCE UPDATE
        if (selectedCustomer) {
            batch.update(db.collection('customers').doc(selectedCustomer.id), {
                balance: balance,
                lastBillNo: billNo,
                lastBillAt: new Date().toISOString()
            });
        }

        // 🔥 COMMIT — SAB EK SATH! (Atomic — ya sab hoga, ya kuch nahi!)
        await batch.commit();

        // ✅ SUCCESS SCREEN
        lastSavedBill = { 
            billNo, customerName, items, subTotal, discount, grand, received, balance, prevBal,
            agencyCity: (myAgency && myAgency.city) || '',
            agencyMobile: (myAgency && myAgency.mobile) || ''
        };

        document.querySelectorAll('.panel-container .panel-card').forEach((c, i) => {
            if (i === 0) c.style.display = 'none'; // pehla card (tabs/billno)
        });
        document.getElementById('saveBillBtn').style.display = 'none';
        document.getElementById('successScreen').style.display = 'block';

        document.getElementById('ssBillNo').innerText = billNo;
        document.getElementById('ssCustomer').innerText = customerName;
        document.getElementById('ssGrand').innerText = grand.toFixed(2);
        document.getElementById('ssReceived').innerText = received.toFixed(2);
        document.getElementById('ssBalance').innerText = balance.toFixed(2);

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        document.getElementById('saveBillBtn').disabled = false;
        console.error('Save error:', error);
        Swal.fire('❌ Error', 'Bill save nahi hua: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// ✅ SUCCESS SCREEN — OUTPUT FUNCTIONS
// ============================================
document.getElementById('outNewBillBtn').addEventListener('click', () => {
    document.getElementById('successScreen').style.display = 'none';
    document.getElementById('saveBillBtn').style.display = 'block';
    
    document.querySelectorAll('.panel-container .panel-card').forEach((c, i) => {
        if (i === 0) c.style.display = 'block';
    });
    
    switchMode(currentMode);
    document.getElementById('sumDiscount').value = 0;
    document.getElementById('sumReceived').value = 0;
});

// ============================================
// 🖨️ CLEAN BILL HTML BUILDER (Print/PDF/JPG — sab isi se!)
// ============================================
function buildBillHTML(bill) {
    const bizName = (myAgency && myAgency.name) || 'Easy Bill Generator';
    const bizMobile = (myAgency && myAgency.mobile) || '';
    const bizCity = (myAgency && myAgency.city) || '';
    
    return `
    <html>
    <head>
        <title>Bill ${bill.billNo}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; max-width: 650px; margin: auto; color: #333; }
            .biz-header { text-align: center; border-bottom: 3px double #333; padding-bottom: 12px; margin-bottom: 15px; }
            .biz-header h1 { margin: 0; font-size: 26px; color: #2c3e50; }
            .biz-header p { margin: 3px 0; font-size: 13px; color: #555; }
            .bill-meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; }
            .bill-meta div { line-height: 1.6; }
            .cust-box { background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #444; padding: 7px 8px; text-align: left; font-size: 13px; }
            th { background: #f0f0f0; }
            td.qty, td.rate, td.total { text-align: right; }
            .totals { margin-top: 12px; }
            .totals div { display: flex; justify-content: space-between; padding: 5px 10px; font-size: 14px; }
            .totals .grand { border-top: 2px solid #333; font-weight: bold; font-size: 16px; }
            .totals .bal { color: #c0392b; font-weight: bold; }
            .sig-area { margin-top: 40px; text-align: right; }
            .sig-line { border-top: 1px solid #333; width: 160px; display: inline-block; padding-top: 5px; font-weight: bold; }
            .footer-note { text-align: center; font-size: 10px; color: #888; margin-top: 25px; font-style: italic; }
            .thanks { text-align: center; font-weight: bold; margin-top: 15px; color: #2c3e50; }
        </style>
    </head>
    <body>
        <div class="biz-header">
            <h1>${bizName}</h1>
            ${bizMobile ? `<p>📱 ${bizMobile}</p>` : ''}
            ${bizCity ? `<p>📍 ${bizCity}</p>` : ''}
        </div>
        
        <div class="bill-meta">
            <div>
                <b>Bill No:</b> ${bill.billNo}<br>
                <b>Customer:</b> ${bill.customerName || 'Counter Sale'}<br>
                <b>Date:</b> ${bill.date || '-'} | <b>Time:</b> ${bill.time || '-'}
            </div>
            <div style="text-align: right;">
                <b>Type:</b> ${bill.type === 'stock' ? '📦 Stock Bill' : '⚡ Instant Bill'}<br>
                <b>Items:</b> ${(bill.items || []).length}
            </div>
        </div>

        <table>
            <tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            ${(bill.items || []).map((it, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${it.name}</td>
                    <td class="qty">${it.qty}</td>
                    <td class="rate">Rs ${it.rate}</td>
                    <td class="total">Rs ${(it.total || 0).toFixed(2)}</td>
                </tr>`).join('')}
        </table>

        <div class="totals">
            <div><span>Sub Total:</span><span>Rs ${(bill.subTotal || 0).toFixed(2)}</span></div>
            <div><span>Discount:</span><span>- Rs ${(bill.discount || 0).toFixed(2)}</span></div>
            <div class="grand"><span>Grand Total:</span><span>Rs ${(bill.grandTotal || 0).toFixed(2)}</span></div>
            <div><span>Previous Balance:</span><span>Rs ${(bill.previousBalance || 0).toFixed(2)}</span></div>
            <div><span>Received:</span><span>- Rs ${(bill.received || 0).toFixed(2)}</span></div>
            <div class="bal"><span>TOTAL BALANCE:</span><span>Rs ${(bill.balance || 0).toFixed(2)}</span></div>
        </div>

        <div class="thanks">🙏 Shukriya! Dobara tashreef layen!</div>
        
        <div class="sig-area">
            <div class="sig-line">Authorized Signature</div>
        </div>

        <div class="footer-note">Bill ${bill.billNo} — Easy Bill Generator se generate hua hai.</div>
    </body>
    </html>
    `;
}

// 🖨️ PRINT
document.getElementById('outPrintBtn').addEventListener('click', () => {
    if (!lastSavedBill) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(buildBillHTML(lastSavedBill));
    win.document.close();
    setTimeout(() => win.print(), 500);
});

// 📄 PDF
document.getElementById('outPdfBtn').addEventListener('click', () => {
    if (!lastSavedBill) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(buildBillHTML(lastSavedBill));
    win.document.close();
    setTimeout(() => {
        win.print();
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 3000, icon: 'info',
            title: '📄 Print dialog mein "Save as PDF" select karein!'
        });
    }, 500);
});

// 🖼️ JPG
document.getElementById('outJpgBtn').addEventListener('click', async () => {
    if (!lastSavedBill) return;

    let holder = document.getElementById('jpgHolder');
    if (!holder) {
        holder = document.createElement('div');
        holder.id = 'jpgHolder';
        holder.style.cssText = 'position:absolute; left:-10000px; top:0; width:600px; background:#fff;';
        document.body.appendChild(holder);
    }
    holder.innerHTML = buildBillHTML(lastSavedBill)
        .replace('<html>', '<div>').replace('</html>', '</div>')
        .replace('<head>', '').replace('</head>', '')
        .replace(/<style>[\s\S]*?<\/style>/, '')
        .replace('<body>', '').replace('</body>', '');

    try {
        const canvas = await html2canvas(holder, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `Bill_${lastSavedBill.billNo}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
        
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2000, icon: 'success',
            title: '🖼️ JPG downloaded!'
        });
    } catch (e) {
        console.error(e);
        Swal.fire('❌ Error', 'JPG fail hua!', 'error');
    }
});

// 📤 SHARE (WhatsApp — JPG + text!)
document.getElementById('outShareBtn').addEventListener('click', async () => {
    if (!lastSavedBill) return;
    const b = lastSavedBill;

    let shareText = `🧾 *BILL ${b.billNo}*\n`;
    shareText += `👤 Customer: ${b.customerName}\n`;
    shareText += `📅 ${b.date || ''}\n\n`;
    shareText += `📦 *Items:*\n`;
    (b.items || []).forEach((it, i) => {
        shareText += `${i + 1}. ${it.name} — ${it.qty} × ${it.rate} = Rs ${(it.total || 0).toFixed(2)}\n`;
    });
    shareText += `\n💰 Grand Total: Rs ${(b.grandTotal || 0).toFixed(2)}\n`;
    shareText += `💵 Received: Rs ${(b.received || 0).toFixed(2)}\n`;
    shareText += `📊 Balance: Rs ${(b.balance || 0).toFixed(2)}\n`;

    try {
        if (navigator.canShare && navigator.share) {
            let holder = document.getElementById('jpgHolder');
            if (!holder) {
                holder = document.createElement('div');
                holder.id = 'jpgHolder';
                holder.style.cssText = 'position:absolute; left:-10000px; top:0; width:600px; background:#fff;';
                document.body.appendChild(holder);
            }
            holder.innerHTML = buildBillHTML(b)
                .replace('<html>', '<div>').replace('</html>', '</div>')
                .replace('<head>', '').replace('</head>', '')
                .replace(/<style>[\s\S]*?<\/style>/, '')
                .replace('<body>', '').replace('</body>', '');

            const canvas = await html2canvas(holder, { scale: 2, backgroundColor: '#ffffff' });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            const file = new File([blob], `Bill_${b.billNo}.jpg`, { type: 'image/jpeg' });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ 
                    files: [file], 
                    title: `Bill ${b.billNo}`, 
                    text: shareText 
                });
                return;
            }
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');

    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('Share error:', e);
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
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