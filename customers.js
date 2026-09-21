// ============================================
// 👥 EASY BILL GENERATOR — CUSTOMERS MODULE (v1)
// ✅ Add/Edit/Delete + Search
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
// 📋 CUSTOMERS RENDER
// ============================================
function renderCustomers() {
    const container = document.getElementById('customersList');
    const countEl = document.getElementById('custCount');
    if (countEl) countEl.innerText = allCustomers.length;

    let filtered = allCustomers.filter(c => {
        if (!currentSearch) return true;
        const name = (c.name || '').toLowerCase();
        const mobile = (c.mobile || '');
        return name.includes(currentSearch) || mobile.includes(currentSearch);
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

        // Balance badge
        const balHtml = bal > 0
            ? `<span class="customer-balance bal-due">💰 Balance: Rs ${bal.toLocaleString()}</span>`
            : `<span class="customer-balance bal-zero">✅ No Balance</span>`;

        html += `
        <div class="customer-card ${bal > 0 ? 'has-balance' : ''}">
            <div class="customer-info">
                <div class="customer-name">👤 ${c.name || 'Unnamed'}</div>
                <div class="customer-details">
                    ${c.mobile ? `<span>📱 ${c.mobile}</span>` : ''}
                    ${c.address ? `<span>📍 ${c.address}</span>` : ''}
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

    const name = document.getElementById('custName').value.trim();
    const mobile = document.getElementById('custMobile').value.trim();
    const address = document.getElementById('custAddress').value.trim();

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

        // Duplicate check (same naam — same agency)
        const dup = allCustomers.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
        if (dup) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Duplicate Customer!',
                text: `"${name}" pehle se saved hai!`,
                confirmButtonText: 'OK'
            });
            return;
        }
    }

    document.getElementById('saveCustomerBtn').disabled = true;

    try {
        const custData = {
            name: name,
            mobile: mobile,
            address: address,
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
            custData.balance = 0;  // 🆕 Balance tracking (Phase 4 se bills update karenge!)
            custData.createdAt = new Date().toISOString();
            custData.createdBy = myUid;
            await db.collection('customers').add(custData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: '✅ Customer added!'
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
// ✏️ EDIT CUSTOMER
// ============================================
function editCustomer(custId) {
    const c = allCustomers.find(x => x.id === custId);
    if (!c) return;

    editingCustomerId = custId;

    document.getElementById('custName').value = c.name || '';
    document.getElementById('custMobile').value = c.mobile || '';
    document.getElementById('custAddress').value = c.address || '';

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
