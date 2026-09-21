// ============================================
// 👥 EASY BILL GENERATOR — CUSTOMERS MODULE (v3)
// ✅ Add/Edit/Delete + Smart Search (naam/mobile/route/city/shop!)
// ✅ 🆕 Shop Name, City, Customer Type, Credit Limit, Terms, Notes
// ✅ 🆕 Smart Duplicate (naam+mobile combo)
// ✅ Previous Balance + Route
// ✅ Balance tracking (bills se update — Phase 4!)
// ✅ Limits (50 customers Free)
// ✅ Multi-tenant (agencyId)
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

let myUid = null;
let myAgencyId = null;
let myLimits = { maxCustomers: 50 };
let allCustomers = [];
let currentSearch = '';
let editingCustomerId = null;

// ============================================
// 🏷️ LABELS (display ke liye)
// ============================================
const CUST_TYPE_LABELS = {
    'retail': '🛒 Retail',
    'wholesale': '📦 Wholesale',
    'special': '⭐ Special'
};
const TERMS_LABELS = {
    'cash': '💵 Cash',
    '7': '📅 7 Days',
    '15': '📅 15 Days',
    '30': '📅 30 Days'
};

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
            if (me.role === 'super-admin') {
                myAgencyId = 'super-admin-hq';
            } else {
                Swal.fire('⚠️', 'Agency link nahi hai! Profile se complete karein.', 'warning')
                    .then(() => window.location.href = 'profile.html');
                return;
            }
        }

        // Limits load
        let pkgId = 'free';
        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            if (agDoc.exists) pkgId = agDoc.data().packageId || 'free';
        } catch (e) {}
        try {
            const pkgDoc = await db.collection('packages').doc(pkgId).get();
            if (pkgDoc.exists && pkgDoc.data().limits) {
                myLimits = { ...myLimits, ...pkgDoc.data().limits };
            }
        } catch (e) {}
        
        if (!myLimits.maxCustomers) myLimits.maxCustomers = 50;
        const limEl = document.getElementById('custLimit');
        if (limEl) limEl.innerText = myLimits.maxCustomers;

        listenCustomers();

    } catch (error) {
        console.error('Customers init error:', error);
        Swal.fire('Error', 'Customers load fail: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// 🔄 REAL-TIME LISTENER
// ============================================
let custUnsubscribe = null;
function listenCustomers() {
    if (custUnsubscribe) custUnsubscribe();
    
    custUnsubscribe = db.collection('customers')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allCustomers = [];
            snap.forEach(d => {
                allCustomers.push({ id: d.id, ...d.data() });
            });
            allCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            renderStats();
            renderCustomers();
        }, (error) => {
            console.error('Customers listener error:', error);
            document.getElementById('customersList').innerHTML = 
                '<div class="error-inline">⚠️ Customers load fail: ' + error.code + '</div>';
        });
}

// ============================================
// 📊 STATS
// ============================================
function renderStats() {
    document.getElementById('statTotal').innerText = allCustomers.length;
    
    let totalBal = 0;
    allCustomers.forEach(c => { totalBal += (c.balance || 0); });
    document.getElementById('statBalance').innerText = Math.round(totalBal).toLocaleString();
}

// ============================================
// 📋 CUSTOMERS RENDER (naye fields ke sath!)
// ============================================
function renderCustomers() {
    const container = document.getElementById('customersList');
    const countEl = document.getElementById('custCount');
    if (countEl) countEl.innerText = allCustomers.length;

    // 🆕 SMART SEARCH: naam, mobile, route, city, shop name!
    let filtered = allCustomers.filter(c => {
        if (!currentSearch) return true;
        const name = (c.name || '').toLowerCase();
        const mobile = (c.mobile || '');
        const route = (c.route || '').toLowerCase();
        const city = (c.city || '').toLowerCase();
        const shop = (c.shopName || '').toLowerCase();
        return name.includes(currentSearch) || 
               mobile.includes(currentSearch) || 
               route.includes(currentSearch) ||
               city.includes(currentSearch) ||
               shop.includes(currentSearch);
    });

    if (allCustomers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">👥</div>
                <strong>Koi customer nahi hai!</strong><br>
                Upar se pehla CUSTOMER ADD karein!
            </div>`;
        return;
    }
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🔍</div>
                Koi match nahi mila!<br>
                <small>Search change karein</small>
            </div>`;
        return;
    }

    let html = '';
    filtered.forEach(c => {
        const bal = c.balance || 0;
        const safeName = (c.name || '').replace(/'/g, '').replace(/"/g, '');

        const balHtml = bal > 0
            ? `<span class="customer-balance bal-due">💰 Balance: Rs ${bal.toLocaleString()}</span>`
            : `<span class="customer-balance bal-zero">✅ No Balance</span>`;

        // 🆕 Type badge
        const typeHtml = c.customerType 
            ? `<span class="cust-type-tag">${CUST_TYPE_LABELS[c.customerType] || c.customerType}</span>`
            : '';

        html += `
        <div class="customer-card ${bal > 0 ? 'has-balance' : ''}">
            <div class="customer-info">
                <div class="customer-name">👤 ${c.name || 'Unnamed'} ${typeHtml}</div>
                <div class="customer-details">
                    ${c.shopName ? `<span>🏪 ${c.shopName}</span>` : ''}
                    ${c.mobile ? `<span>📱 ${c.mobile}</span>` : ''}
                    ${c.address ? `<span>📍 ${c.address}</span>` : ''}
                    ${c.route ? `<span>🛣️ ${c.route}</span>` : ''}
                    ${c.city ? `<span>🏙️ ${c.city}</span>` : ''}
                </div>
                <div class="customer-details">
                    ${c.paymentTerms ? `<span>📅 ${TERMS_LABELS[c.paymentTerms] || c.paymentTerms}</span>` : ''}
                    ${c.creditLimit ? `<span>💳 Credit Limit: Rs ${Number(c.creditLimit).toLocaleString()}</span>` : ''}
                </div>
                ${balHtml}
            </div>
            <div class="customer-actions">
                <button class="btn-icon btn-edit" onclick="editCustomer('${c.id}')" title="Edit">✏️</button>
                <button class="btn-icon btn-del" onclick="deleteCustomer('${c.id}', '${safeName}')" title="Delete">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// ============================================
// 🔍 SEARCH EVENT
// ============================================
document.getElementById('searchInput').addEventListener('input', function() {
    currentSearch = this.value.toLowerCase().trim();
    renderCustomers();
});

// ============================================
// ➕ ADD/EDIT FORM (Toggle + Save!)
// ============================================
document.getElementById('addCustomerToggle').addEventListener('click', function() {
    const form = document.getElementById('addCustomerForm');
    const arrow = document.getElementById('toggleArrow');
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    arrow.classList.toggle('open', !isOpen);
});

document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🆕 SAARI FIELDS collect
    const name = document.getElementById('custName').value.trim();
    const shopName = document.getElementById('custShopName').value.trim();
    const customerType = document.getElementById('custType').value;
    const mobile = document.getElementById('custMobile').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const route = document.getElementById('custRoute').value.trim();
    const city = document.getElementById('custCity').value.trim();
    const paymentTerms = document.getElementById('custTerms').value;
    const prevBalance = parseFloat(document.getElementById('custPrevBalance').value) || 0;
    const creditLimit = parseFloat(document.getElementById('custCreditLimit').value) || 0;
    const notes = document.getElementById('custNotes').value.trim();

    if (!name) { Swal.fire('⚠️', 'Customer ka naam lazmi hai!', 'warning'); return; }

    // 🔒 LIMIT CHECK (sirf naye par)
    if (!editingCustomerId) {
        if (allCustomers.length >= myLimits.maxCustomers) {
            Swal.fire({
                icon: 'warning',
                title: '👥 Customer Limit Reached!',
                html: `Aap ka package max <b>${myLimits.maxCustomers} customers</b> allow karta hai.<br>
                       <span style="color:#e74c3c; font-weight:bold;">💎 Upgrade ke liye admin se contact karein!</span>`,
                confirmButtonText: 'OK'
            });
            return;
        }

        // 🆕 SMART DUPLICATE: Naam + Mobile dono same = Duplicate
        const dup = allCustomers.find(c => 
            (c.name || '').toLowerCase() === name.toLowerCase() &&
            (c.mobile || '') === mobile
        );
        if (dup) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Duplicate Customer!',
                html: `"${name}" (${mobile || 'bina mobile'}) pehle se saved hai!<br>
                       <small>Agar alag customer hai to Mobile Number alag dalein.</small>`,
                confirmButtonText: 'OK'
            });
            return;
        }
    }

    document.getElementById('saveCustomerBtn').disabled = true;

    try {
        const custData = {
            name: name,
            shopName: shopName,              // 🆕
            customerType: customerType,      // 🆕
            mobile: mobile,
            address: address,
            route: route,
            city: city,                      // 🆕
            paymentTerms: paymentTerms,      // 🆕
            creditLimit: creditLimit,        // 🆕
            notes: notes,                    // 🆕
            previousBalance: prevBalance,
            agencyId: myAgencyId,
            updatedAt: new Date().toISOString()
        };

        if (editingCustomerId) {
            await db.collection('customers').doc(editingCustomerId).update(custData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: '✅ Customer updated!'
            });
        } else {
            // 🆕 Balance = Previous Balance se start!
            custData.balance = prevBalance;
            custData.createdAt = new Date().toISOString();
            custData.createdBy = myUid;
            await db.collection('customers').add(custData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: prevBalance > 0 
                    ? `✅ Customer added! Balance: Rs ${prevBalance.toLocaleString()}` 
                    : '✅ Customer added!'
            });
        }

        document.getElementById('addCustomerForm').reset();
        editingCustomerId = null;
        const headerH2 = document.querySelector('.add-item-header h2');
        if (headerH2) headerH2.innerHTML = '<i class="fas fa-user-plus"></i> Add New Customer';
        document.getElementById('addCustomerForm').style.display = 'none';
        const arrow = document.getElementById('toggleArrow');
        if (arrow) arrow.classList.remove('open');

    } catch (error) {
        document.getElementById('saveCustomerBtn').disabled = false;
        console.error('Save error:', error);
        Swal.fire('❌ Error', 'Customer save nahi hua: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// ✏️ EDIT CUSTOMER (saare fields!)
// ============================================
function editCustomer(custId) {
    const c = allCustomers.find(x => x.id === custId);
    if (!c) return;

    editingCustomerId = custId;

    document.getElementById('custName').value = c.name || '';
    document.getElementById('custShopName').value = c.shopName || '';
    document.getElementById('custType').value = c.customerType || '';
    document.getElementById('custMobile').value = c.mobile || '';
    document.getElementById('custAddress').value = c.address || '';
    document.getElementById('custRoute').value = c.route || '';
    document.getElementById('custCity').value = c.city || '';
    document.getElementById('custTerms').value = c.paymentTerms || '';
    document.getElementById('custPrevBalance').value = c.previousBalance || '';
    document.getElementById('custCreditLimit').value = c.creditLimit || '';
    document.getElementById('custNotes').value = c.notes || '';

    document.getElementById('addCustomerForm').style.display = 'block';
    const arrow = document.getElementById('toggleArrow');
    if (arrow) arrow.classList.add('open');
    const headerH2 = document.querySelector('.add-item-header h2');
    if (headerH2) headerH2.innerHTML = '<i class="fas fa-edit"></i> Edit Customer: ' + (c.name || '');

    document.getElementById('addCustomerForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// 🗑️ DELETE CUSTOMER
// ============================================
async function deleteCustomer(custId, name) {
    const result = await Swal.fire({
        title: '🗑️ Delete Customer?',
        html: `<b>${name}</b> ko delete karna hai?<br>
               <small style="color:#e74c3c;">Ye wapas nahi ayega!</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#c0392b',
        confirmButtonText: '🗑️ Delete',
        cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
        await db.collection('customers').doc(custId).delete();
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success',
            title: '🗑️ Customer deleted!'
        });
    } catch (e) {
        Swal.fire('Error', 'Delete fail: ' + e.code, 'error');
    }
}
