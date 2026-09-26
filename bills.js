// ============================================
// 🧾 EASY BILL GENERATOR — BILLS (Phase 4, v4 FINAL!)
// ✅ Dual Mode (Stock-first — Instant redirect!)
// ✅ 🔥 QUOTA OPTIMIZED:
//    ├── COUNTER SYSTEM: Bill No = 1 read + 1 write
//    ├── BATCHED WRITES: bill + stock + movements + customer
//    └── COMPACT MOVEMENTS: bill-level doc (items array!)
// ✅ PREVIEW SYSTEM: Display pehle, increment SAVE par
//    (No more skipped numbers — STK-1, STK-2, STK-3 sahi!)
// ✅ 🆕 ROBUST buildBillHTML (Fallback — kabhi white page nahi!)
// ✅ 🆕 Date/Time print par bhari hui!
// ✅ 🆕 JPG/Share — STYLE EXTRACT (formatted images!)
// ✅ Customer suggest + info + balance update
// ✅ Success Screen + Print/PDF/JPG/Share
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
let myPermissions = { instant: false, stock: true, ntn: true };
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
// 👀 PREVIEW: Counter padho, INCREMENT MAT karo!
// (Bill kholte hi number dikhta hai — save par asli increment!)
// ============================================
async function previewBillNo(type) {
    const prefix = (myAgency && myAgency.billPrefixes && myAgency.billPrefixes[type])
        ? myAgency.billPrefixes[type]
        : (type === 'instant' ? 'INS-' : 'STK-');

    const counterRef = db.collection('counters').doc(myAgencyId + '_' + type);
    try {
        const cDoc = await counterRef.get();
        const next = (cDoc.exists ? (cDoc.data().count || 0) : 0) + 1;
        billNo = prefix + next;
    } catch (e) {
        billNo = prefix + '1';
    }
    document.getElementById('billNoDisplay').innerText = billNo;
}

// ============================================
// 🔢 ASLI INCREMENT: Counter +1 (SAVE ke waqt!)
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
        // Fallback: timestamp-based (unique!)
        billNo = prefix + Date.now().toString().slice(-6);
        document.getElementById('billNoDisplay').innerText = billNo;
    }
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

        myPermissions = me.permissions || { instant: false, stock: true, ntn: true };

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
    tabI.style.display = 'none';

    if (!myPermissions.stock) {
        tabS.classList.add('disabled');
    } else {
        tabS.classList.add('active');
    }

    tabS.addEventListener('click', () => {
        if (!myPermissions.stock) {
            Swal.fire('🔒', 'Stock Bills allowed nahi hain!', 'info');
            return;
        }
        switchMode('stock');
    });

    tabI.addEventListener('click', () => {
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
// 🔄 MODE SWITCH (Preview number — increment NAHI!)
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

    // 👀 PREVIEW — counter increment NAHI hota!
    previewBillNo(mode);

    // NTN check (permissions ke mutabiq)
    const ntnWrap = document.querySelector('.ntn-wrap');
    if (ntnWrap) ntnWrap.style.display = myPermissions.ntn ? '' : 'none';

    calcTotals();
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
    
    // 🆕 TAX CALC (checkbox ON + rate > 0)
    const taxEnabled = document.getElementById('taxEnabled');
    const taxRateInput = document.getElementById('taxRate');
    let taxAmount = 0;
    if (taxEnabled && taxEnabled.checked && taxRateInput) {
        const taxRate = parseFloat(taxRateInput.value) || 0;
        if (taxRate > 0) taxAmount = ((subTotal - discount) * taxRate) / 100;
    }

    const grand = Math.max(0, (subTotal - discount) + taxAmount);
const received = parseFloat(document.getElementById('sumReceived').value) || 0;
const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
const balance = (prevBal + grand) - received;

document.getElementById('sumSubTotal').innerText = subTotal.toFixed(2);
document.getElementById('sumGrand').innerText = grand.toFixed(2);

const prevBalanceEl = document.getElementById('sumPrevBalance');
if (prevBalanceEl) prevBalanceEl.innerText = prevBal.toFixed(2);

document.getElementById('sumBalance').innerText = balance.toFixed(2);

const taxEl = document.getElementById('sumTax');
if (taxEl) taxEl.innerText = taxAmount.toFixed(2);
}

document.getElementById('sumDiscount').addEventListener('input', calcTotals);
document.getElementById('sumReceived').addEventListener('input', calcTotals);

const taxEnabled = document.getElementById('taxEnabled');
const taxRate = document.getElementById('taxRate');

if (taxEnabled) {
    taxEnabled.addEventListener('change', calcTotals);
}
if (taxRate) {
    taxRate.addEventListener('input', calcTotals);
}
// ============================================
// 💾 SAVE BILL — 🔥 BATCHED WRITE + ASLI INCREMENT!
// Yahan ASLI counter increment hota hai (preview nahi!)
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

    // 🆕 TAX CALC (calcTotals jaisa hi — save par bhi!)
    const taxEnabled = document.getElementById('taxEnabled');
    const taxRateInput = document.getElementById('taxRate');
    let taxRate = 0;
    let taxAmount = 0;
    if (taxEnabled && taxEnabled.checked && taxRateInput) {
        taxRate = parseFloat(taxRateInput.value) || 0;
        if (taxRate > 0) taxAmount = ((subTotal - discount) * taxRate) / 100;
    }

    const grand = Math.max(0, (subTotal - discount) + taxAmount);
    const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
    const balance = (prevBal + grand) - received;

    // 🆕 STOCK VALIDATION (permissive — bill phir bhi banega!)
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
        // 🔢 ASLI INCREMENT — ab counter +1 hoga (preview tha pehle!)
        await generateBillNo(currentMode);

        // ============================================
        // 🔥 BATCHED WRITE — EK ATOMIC OPERATION!
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
            customerNTN: selectedCustomer ? (selectedCustomer.ntn || '') : '',   // 🆕
            items: items,
            itemCount: items.length,
            subTotal: subTotal,
            discount: discount,
            taxRate: taxRate,        // 🆕
            taxAmount: taxAmount,    // 🆕
            grandTotal: grand,
            received: received,
            previousBalance: prevBal,
            balance: balance,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}),
            createdAt: new Date().toISOString()
        };
        batch.set(billRef, billData);

        // 2️⃣ 📦 STOCK MINUS + 3️⃣ COMPACT MOVEMENTS
        if (currentMode === 'stock') {
            const movements = [];

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

            if (movements.length > 0) {
                const moveRef = db.collection('movements').doc();
                batch.set(moveRef, {
                    agencyId: myAgencyId,
                    billNo: billNo,
                    customerName: customerName,
                    type: 'out',
                    reason: 'sale',
                    reasonLabel: '🛒 Sale (Bill ' + billNo + ')',
                    movements: movements,
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

        // 🔥 COMMIT — SAB EK SATH!
        await batch.commit();

        // ✅ SUCCESS SCREEN
        lastSavedBill = { 
            billNo, customerName, items, subTotal, discount, grand, received, balance, prevBal,
            previousBalance: prevBal,
            taxRate: taxRate,        // 🆕 (print par tax row dikhegi!)
            taxAmount: taxAmount,    // 🆕
            date: billData.date,
            time: billData.time,
            agencyCity: (myAgency && myAgency.city) || '',
            agencyMobile: (myAgency && myAgency.mobile) || '',
            agencyAddress: (myAgency && myAgency.address) || '',
            agencyNTN: (myAgency && myAgency.ntn) || ''
        };

        document.querySelectorAll('.panel-container .panel-card').forEach((c, i) => {
            if (i === 0) c.style.display = 'none';
        });
        document.getElementById('saveBillBtn').style.display = 'none';
        document.getElementById('successScreen').style.display = 'block';

        document.getElementById('ssBillNo').innerText = billNo;
        document.getElementById('ssCustomer').innerText = customerName;
        document.getElementById('ssGrand').innerText = grand.toFixed(2);
        const ssPrevBalEl = document.getElementById('ssPrevBalance');
if (ssPrevBalEl) {
    ssPrevBalEl.innerText = prevBal.toFixed(2);
}
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
// ✅ SUCCESS SCREEN — NEW BILL BUTTON
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
// 🎨 BUILD BILL HTML — ROBUST (Template + Fallback!)
// Template fail ho to FALLBACK bill — kabhi white page nahi!
// ============================================
function buildBillHTML(bill) {
    if (typeof renderBillTemplate === 'function' &&
        typeof BILL_TEMPLATES !== 'undefined') {
        try {
            return renderBillTemplate(bill);
        } catch (e) {
            console.error('⚠️ Template render fail — fallback:', e);
        }
    }
    return buildFallbackBillHTML(bill);
}

// ============================================
// 🛡️ FALLBACK BILL — PROFESSIONAL LAYOUT (v3 FINAL)
// ✅ Logo (left, agar ho) + Naam + Address
// ✅ 🆕 Owner Name + 2 Mobiles — EK LINE (auto-shrink!)
// ✅ 🆕 NTN + Licence — EK line (inline, text only)
// ✅ 🆕 Bill Meta — grey rounded box, Customer box ke ANDAR right!
// ✅ 🆕 Customer NTN bhi box mein!
// ✅ CASH/CREDIT (right top — bold!)
// ============================================
function buildFallbackBillHTML(bill) {
    const ag = myAgency || {};
    const bizName = ag.name || 'Easy Bill Generator';
    const payType = bill.payType || ag.payType || 'CASH';

    // 📱 EK LINE: Owner Name + 2 Mobiles (naam lamba ho to font khud adjust!)
    const ownerNm = ag.ownerName || '';
    const mobilesArr = [ag.mobile, ag.mobile2].filter(m => m && m.trim()).map(m => `📱 ${m}`);

    // Date/Time fallback
    let billDate = bill.date || '';
    let billTime = bill.time || '';
    if (!billDate) {
        const now = new Date();
        billDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    }
    if (!billTime) {
        billTime = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
    }

    const custName = bill.customerName || 'Counter Sale';
    const custMobile = bill.customerMobile || '';
    const custAddress = (bill.customerAddress || (selectedCustomer && selectedCustomer.address)) || '';

    // 🆕 Tax row (agar bill mein tax ho!)
    const taxRow = (bill.taxAmount && bill.taxAmount > 0)
        ? `<div><span class="label">Tax (${bill.taxRate || 0}%):</span><span>+ Rs ${bill.taxAmount.toFixed(2)}</span></div>`
        : '';

    return `
    <html>
    <head>
        <title>Bill ${bill.billNo}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 700px; margin: auto; color: #222; }
            
           /* 🏢 AGENCY HEADER (Logo left + details + PAY TYPE right) */
            .ag-header {
                display: flex;
                align-items: flex-start;
                border-bottom: 3px double #333;
                padding-bottom: 10px;
                margin-bottom: 12px;
            }
            .ag-logo {
                width: 60px; min-height: 55px;
                flex: 0 0 60px;
                display: flex; align-items: center; justify-content: center;
            }
            .ag-logo img { max-width: 60px; max-height: 55px; }
            .ag-logo .logo-space { width: 60px; }
            .ag-details { flex: 1; text-align: left; padding: 0 10px; min-width: 0; }
            
            /* 🏢 NAAM — clamp se khud adjust (lamba naam = chota font!) */
            .ag-name {
                font-size: clamp(11px, 4vw, 19px);
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 0.5px;
                white-space: nowrap;
                overflow: hidden;
            }
            .ag-address { font-size: 11px; color: #444; margin: 2px 0 3px; }
            
            /* 📱 OWNER + MOBILES EK LINE (flex — sab fit!) */
            .ag-contact-line {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: nowrap;
                font-size: 12px;
                color: #444;
                font-weight: bold;
                overflow: hidden;
            }
            /* Naam lamba to ye khud shrink hoga (mobiles sahi rahenge!) */
            .ag-owner-nm {
                font-weight: 900;
                color: #1a1a1a;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1 1 auto;
                min-width: 0;
            }
            .ag-owner-nm.small { font-size: 10px !important; }
            .ag-mobiles span { margin-right: 8px; white-space: nowrap; }
            
            /* 🔢📋 NTN + LICENCE (ek line — inline!) */
            .ag-ntn-line { font-size: 11px; color: #333; font-weight: bold; margin-top: 3px; }
            
            /* 💳 PAY TYPE (right top — bold!) */
            .pay-type {
                flex: 0 0 auto;
                font-size: 26px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 3px;
                align-self: center;
            }

            /* 🧾 BILL META (grey rounded — right column ke andar!) */
            .bill-meta-box {
                display: flex;
                justify-content: flex-end;
            }
            .bill-meta-inner {
                background: #f8f9fa;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 12px;
                line-height: 1.9;
                min-width: 150px;
            }
            .bill-meta-inner b { color: #2c3e50; }
            
            /* 👤 CUSTOMER BOX */
            .cust-box {
                background: #f8f9fa;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 12px;
                font-size: 13px;
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                align-items: flex-start;
            }
            .cust-left { flex: 1; min-width: 200px; line-height: 1.8; }
            .cust-right {
                flex: 0 0 auto;
                text-align: left;
                border-left: 1px dashed #bbb;
                padding-left: 15px;
            }
            .cust-name-big { font-size: 15px; font-weight: bold; color: #1a1a1a; }
            .cust-addr { color: #444; word-wrap: break-word; max-width: 320px; display: inline; }
            .cust-label { font-size: 11px; color: #7f8c8d; font-weight: bold; }
            .dim-value { color: #222; font-weight: 600; }
            
            /* 📋 ITEMS TABLE */
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #444; padding: 7px 8px; text-align: left; font-size: 13px; }
            th { background: #f0f0f0; text-align: center; }
            td.qty, td.rate, td.total { text-align: right; }
            
            /* 💰 TOTALS (labels + amounts SAATH — right block!) */
            .totals {
                margin-top: 12px;
                max-width: 340px;
                margin-left: auto;
                background: #fafbfc;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 8px 15px;
            }
            .totals div {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 0;
                font-size: 14px;
            }
            .totals .label { color: #555; }
            .totals .grand {
                border-top: 2px solid #333;
                font-weight: bold;
                font-size: 15px;
                color: #1a1a1a;
            }
            .totals .bal {
                color: #c0392b;
                font-weight: bold;
                background: #fff3f3;
                border-radius: 6px;
                padding: 4px 8px;
            }
            
            .thanks { text-align: center; font-weight: bold; margin-top: 15px; color: #2c3e50; font-size: 14px; }
            .sig-area { margin-top: 40px; text-align: right; }
            .sig-line { border-top: 1px solid #333; width: 160px; display: inline-block; padding-top: 5px; font-weight: bold; }
            .footer-note { text-align: center; font-size: 10px; color: #888; margin-top: 25px; font-style: italic; }
        </style>
    </head>
    <body>
        <!-- 🏢 AGENCY HEADER (Logo left + details + PAY TYPE right) -->
        <div class="ag-header">
            <div class="ag-logo">
                ${(ag.logoBase64) 
                    ? `<img src="${ag.logoBase64}">` 
                    : `<div class="logo-space"></div>`}
            </div>
            <div class="ag-details">
                <div class="ag-name">${bizName}</div>
                ${ag.address ? `<div class="ag-address"> Address: ${ag.address}</div>` : ''}
                <!-- 🆕 EK LINE: Owner Name + 2 Mobiles -->
                ${(ownerNm || mobilesArr.length > 0) ? `<div class="ag-contact-line" id="agContactLine"><span class="ag-owner-nm" id="agOwnerName" data-name="${ownerNm}">${ownerNm}</span>${mobilesArr.map(m => `<span>${m}</span>`).join(' ')}</div>` : ''}
                ${(ag.ntn || ag.licenceNo) ? `<div class="ag-ntn-line">NTN: ${ag.ntn || '—'}${ag.licenceNo ? ` | Licence: ${ag.licenceNo}` : ''}</div>` : ''}
            </div>
            <div class="pay-type">${payType}</div>
        </div>

        <!-- 👤 CUSTOMER BOX (left details + RIGHT BILL META — ek sath!) -->
        <div class="cust-box">
            <div class="cust-left">
                <span class="cust-label">👤 Customer:</span>
                <span class="cust-name-big"> ${custName}</span>
                ${custMobile ? `<span> &nbsp; 📱 ${custMobile}</span>` : ''}
                ${custAddress ? `<br><span class="cust-label">📍 Address:</span> <span class="cust-addr"> ${custAddress}</span>` : ''}
                ${bill.customerNTN ? `<br><span class="cust-label">🔢 NTN:</span> <span class="dim-value"> ${bill.customerNTN}</span>` : ''}
            </div>
            <div class="cust-right">
                <div class="bill-meta-inner">
                    <b>🧾 Bill No:</b> ${bill.billNo}<br>
                    <b>📅 Date:</b> ${billDate}<br>
                    <b>🕐 Time:</b> ${billTime}
                </div>
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

        <!-- 💰 TOTALS (labels + amounts saath!) -->
        <div class="totals">
            <div><span class="label">Sub Total:</span><span>Rs ${(bill.subTotal || 0).toFixed(2)}</span></div>
            <div><span class="label">Discount:</span><span>- Rs ${(bill.discount || 0).toFixed(2)}</span></div>
            ${taxRow}
            <div class="grand"><span class="label">Grand Total:</span><span>Rs ${(bill.grandTotal || 0).toFixed(2)}</span></div>
            <div><span class="label">Previous Balance:</span><span>Rs ${(bill.previousBalance || 0).toFixed(2)}</span></div>
            <div><span class="label">Received:</span><span>- Rs ${(bill.received || 0).toFixed(2)}</span></div>
            <div class="bal"><span class="label">TOTAL BALANCE:</span><span>Rs ${(bill.balance || 0).toFixed(2)}</span></div>
        </div>

        <div class="thanks"> Shukriya! Dobara tashreef layen!</div>
        
        <div class="sig-area">
            <div class="sig-line">Authorized Signature</div>
        </div>

        <div class="footer-note">Bill ${bill.billNo} — Easy Bill Generator se generate hua hai.</div>

        <!-- 🌟 AUTO-SHRINK SCRIPT (Print window ke ANDAR — yahan chalega!) -->
        <script>
            // Owner name lamba ho to font chota karo!
            // (Mobile numbers sahi size mein rahenge — sirf naam adjust hoga!)
            window.addEventListener('load', function() {
                setTimeout(function() {
                    try {
                        var nameEl = document.getElementById('agOwnerName');
                        if (!nameEl) return;
                        
                        var rawName = nameEl.getAttribute('data-name') || nameEl.innerText;
                        if (!rawName || rawName.trim() === '') return;
                        
                        var words = rawName.split(/\\s+/).length;
                        var fontSize = 13;
                        
                        if (words >= 6) fontSize = 9;
                        else if (words >= 5) fontSize = 10;
                        else if (words >= 4) fontSize = 11;
                        else if (words >= 3) fontSize = 12;
                        
                        nameEl.style.fontSize = fontSize + 'px';
                    } catch (e) { console.warn('Auto-shrink:', e); }
                }, 50);
            });
        </script>
    </body>
    </html>
    `;
}

// ============================================
// 🖨️ PRINT (Try-catch + 1500ms — font load ke liye!)
// ============================================
document.getElementById('outPrintBtn').addEventListener('click', () => {
    if (!lastSavedBill) return;
    
    let billHTML = '';
    try {
        billHTML = buildBillHTML(lastSavedBill);
    } catch (e) {
        console.error('Bill HTML fail:', e);
        Swal.fire('❌ Error', 'Bill bana nahi ja saka: ' + e.message, 'error');
        return;
    }

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(billHTML);
    win.document.close();
    setTimeout(() => win.print(), 1500);
});

// ============================================
// 📄 PDF
// ============================================
document.getElementById('outPdfBtn').addEventListener('click', () => {
    if (!lastSavedBill) return;

    let billHTML = '';
    try {
        billHTML = buildBillHTML(lastSavedBill);
    } catch (e) {
        Swal.fire('❌ Error', 'Bill bana nahi ja saka!', 'error');
        return;
    }

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(billHTML);
    win.document.close();
    setTimeout(() => {
        win.print();
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 3000, icon: 'info',
            title: '📄 "Save as PDF" select karein!'
        });
    }, 1500);
});

// ============================================
// 🖼️ JPG (🆕 Style EXTRACT — formatted image!)
// ============================================
document.getElementById('outJpgBtn').addEventListener('click', async () => {
    if (!lastSavedBill) return;

    let holder = document.getElementById('jpgHolder');
    if (!holder) {
        holder = document.createElement('div');
        holder.id = 'jpgHolder';
        holder.style.cssText = 'position:absolute; left:-10000px; top:0; width:600px; background:#fff;';
        document.body.appendChild(holder);
    }

    // 🆕 STYLE EXTRACT — poora HTML lo, body content + styles alag karo
    const fullHTML = buildBillHTML(lastSavedBill);
    const bodyStart = fullHTML.indexOf('<body>') + 6;
    const bodyEnd = fullHTML.indexOf('</body>');
    const bodyContent = fullHTML.substring(bodyStart, bodyEnd);
    const styleMatch = fullHTML.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';
    
    holder.innerHTML = `<style>${styles}</style><div style="padding:25px;">${bodyContent}</div>`;

    try {
        const canvas = await html2canvas(holder, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        holder.innerHTML = '';
        
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
        holder.innerHTML = '';
        console.error(e);
        Swal.fire('❌ Error', 'JPG fail hua!', 'error');
    }
});

// ============================================
// 📤 SHARE (🆕 Style EXTRACT — formatted image + text!)
// ============================================
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

            // 🆕 STYLE EXTRACT (same as JPG!)
            const fullHTML = buildBillHTML(b);
            const bodyStart = fullHTML.indexOf('<body>') + 6;
            const bodyEnd = fullHTML.indexOf('</body>');
            const bodyContent = fullHTML.substring(bodyStart, bodyEnd);
            const styleMatch = fullHTML.match(/<style>([\s\S]*?)<\/style>/);
            const styles = styleMatch ? styleMatch[1] : '';
            holder.innerHTML = `<style>${styles}</style><div style="padding:25px;">${bodyContent}</div>`;

            const canvas = await html2canvas(holder, { scale: 2, backgroundColor: '#ffffff' });
            holder.innerHTML = '';
            
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
