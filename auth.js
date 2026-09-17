// ============================================
// 🔐 EASY BILL GENERATOR — AUTH SYSTEM (v3)
// ✅ Login + Signup (Pehla user = SUPER ADMIN)
// ✅ Google Login (Continue with Google)
// ✅ Bilingual (English/Urdu)
// ✅ Crash-proof (DOMContentLoaded wrapper)
// ✅ Naam: Easy Bill Generator
// ============================================

// ⚠️ AAP KA CONFIG (multupos project)
const firebaseConfig = {
    apiKey: "AIzaSyDDwKWcixoUThCJQqiVoBcUVsJZI60h43Q",
    authDomain: "multipos-ed91a.firebaseapp.com",
    projectId: "multipos-ed91a",
    storageBucket: "multipos-ed91a.firebasestorage.app",
    messagingSenderId: "862649586987",
    appId: "1:862649586987:web:599772124e4e29404ca16e",
    measurementId: "G-QPCP7S5Q5L"
};

// ============================================
// 🌐 TRANSLATIONS
// ============================================
const AUTH_TEXTS = {
    en: {
        appTitle: "Easy Bill Generator",
        appSubtitle: "Smart Business Management",
        tabLogin: "Login",
        tabSignup: "Sign Up",
        loginBtn: "Login",
        signupBtn: "Create Account",
        googleBtn: "Continue with Google",
        bizSection: "🏢 Business Information",
        accSection: "🔐 Account Details",
        selectType: "Business Type *",
        msgBizName: "Business Name lazmi hai!",
        msgBizType: "Business Type select karein!",
        msgAgencyDone: "🎉 Agency created! Welcome to Free Package!",
        signupNote: "First account becomes Super Admin!",
        msgCreated: "Account created! Super Admin setup complete ✅",
        msgNoMatch: "Passwords do not match!",
        msgShort: "Password must be at least 6 characters!",
        msgWrongPass: "Incorrect email or password!",
        msgExists: "This email is already registered! Try Login.",
        msgTooMany: "Too many attempts. Try again later.",
        msgNetwork: "Network error. Check your internet.",
        msgGeneric: "Something went wrong. Try again.",
        msgFirebaseLoad: "⚠️ Firebase load nahi hua — Internet check karein aur refresh karein!"
    },
    ur: {
        appTitle: "ایزی بل جنریٹر",
        appSubtitle: "سمارٹ بزنس مینجمنٹ",
        tabLogin: "لاگ اِن",
        tabSignup: "نیا اکاؤنٹ",
        loginBtn: "لاگ اِن کریں",
        signupBtn: "اکاؤنٹ بنائیں",
        googleBtn: "گوگل کے ساتھ جاری رکھیں",
        bizSection: "🏢 کاروبار کی معلومات",
        accSection: "🔐 اکاؤنٹ کی تفصیلات",
        selectType: "کاروبار کی قسم *",
        msgBizName: "کاروبار کا نام لازمی ہے!",
        msgBizType: "کاروبار کی قسم منتخب کریں!",
        msgAgencyDone: "🎉 ایجنسی بن گئی! فری پیکج میں خوش آمدید!",
        signupNote: "پہلا اکاؤنٹ سپر ایڈمن بنے گا!",
        msgCreated: "اکاؤنٹ بن گیا! سپر ایڈمن سیٹ اپ مکمل ✅",
        msgNoMatch: "پاس ورڈ میچ نہیں ہو رہے!",
        msgShort: "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے!",
        msgWrongPass: "ای میل یا پاس ورڈ غلط ہے!",
        msgExists: "یہ ای میل پہلے سے رجسٹرڈ ہے! لاگ اِن کریں۔",
        msgTooMany: "بہت زیادہ کوششیں۔ تھوڑی دیر بعد کوشش کریں۔",
        msgNetwork: "انٹرنیٹ کا مسئلہ ہے۔ چیک کریں۔",
        msgGeneric: "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔",
        msgFirebaseLoad: "⚠️ فائر بیس لوڈ نہیں ہوا — انٹرنیٹ چیک کریں اور ریفریش کریں!"
    }
};

let authLang = localStorage.getItem('auth_lang') || 'en';
let auth = null, db = null, firebaseReady = false;

// ============================================
// 🚀 SAB KUCH DOMContentLoaded KE ANDAR (crash-proof!)
// ============================================
document.addEventListener('DOMContentLoaded', function() {

    // -------------------------------------------
    // 🔥 FIREBASE INIT (safety check ke sath)
    // -------------------------------------------
    const msgEl = document.getElementById('authMessage');
    try {
        if (typeof firebase === 'undefined') {
            throw new Error(AUTH_TEXTS[authLang].msgFirebaseLoad);
        }
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        firebaseReady = true;
    } catch (e) {
        // 🔴 Visible error — chupchaap marne ke bajaye batao!
        if (msgEl) {
            msgEl.innerText = e.message;
            msgEl.style.color = '#e74c3c';
        }
        console.error('Firebase Init Error:', e);
    }

    const T = () => AUTH_TEXTS[authLang];

    // -------------------------------------------
    // 📢 MESSAGE HELPER
    // -------------------------------------------
    function showAuthMsg(msgKey, type = 'error') {
        const el = document.getElementById('authMessage');
        el.innerText = T()[msgKey] || msgKey;
        el.style.color = type === 'error' ? '#e74c3c' : '#27ae60';
    }

    function btnLoading(btnId, loading) {
        document.getElementById(btnId).disabled = loading;
    }

    // -------------------------------------------
    // 🔥 FIREBASE ERROR TRANSLATOR
    // -------------------------------------------
    function translateFirebaseError(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'msgGeneric';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'msgWrongPass';
            case 'auth/email-already-in-use': return 'msgExists';
            case 'auth/weak-password': return 'msgShort';
            case 'auth/too-many-requests': return 'msgTooMany';
            case 'auth/network-request-failed': return 'msgNetwork';
            default: return 'msgGeneric';
        }
    }

    // -------------------------------------------
    // 🌐 LANGUAGE SWITCHER
    // -------------------------------------------
    function setAuthLang(lang) {
        authLang = lang;
        localStorage.setItem('auth_lang', lang);
        const L = AUTH_TEXTS[lang];

        // data-i18n elements update
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (L[key]) el.innerText = L[key];
        });

        // Placeholders
        document.getElementById('loginEmail').placeholder = 'Email';
        document.getElementById('loginPassword').placeholder = lang === 'ur' ? 'پاس ورڈ' : 'Password';
        document.getElementById('signupEmail').placeholder = 'Email';
        document.getElementById('signupPassword').placeholder = lang === 'ur' ? 'پاس ورڈ (کم از کم 6 حروف)' : 'Password (min 6 characters)';
        document.getElementById('signupConfirm').placeholder = lang === 'ur' ? 'پاس ورڈ دوبارہ' : 'Confirm Password';

        // Direction (RTL/LTR)
        document.getElementById('authWrapper').setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');

        // Language buttons active state
        document.getElementById('langEn').classList.toggle('active', lang === 'en');
        document.getElementById('langUr').classList.toggle('active', lang === 'ur');
    }

    document.getElementById('langEn').addEventListener('click', () => setAuthLang('en'));
    document.getElementById('langUr').addEventListener('click', () => setAuthLang('ur'));

    // -------------------------------------------
    // 🔄 TAB SWITCHING (Login ↔ Signup)
    // -------------------------------------------
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
    });

    // -------------------------------------------
    // 👁️ PASSWORD TOGGLE
    // -------------------------------------------
    document.querySelectorAll('.toggle-pass').forEach(eye => {
        eye.addEventListener('click', function() {
            const input = document.getElementById(this.dataset.target);
            input.type = input.type === 'password' ? 'text' : 'password';
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // -------------------------------------------
    // 📝 SIGNUP — PEHLA USER = SUPER ADMIN
    // -------------------------------------------
        signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('authMessage').innerText = '';

        // Firebase ready check
        if (!firebaseReady) return showAuthMsg('msgFirebaseLoad');

        // 🆕 Business fields bhi collect karo!
        const bizName = document.getElementById('bizName').value.trim();
        const bizType = document.getElementById('bizType').value;
        const bizMobile = document.getElementById('bizMobile').value.trim();
        const bizCity = document.getElementById('bizCity').value.trim();
        const ownerName = document.getElementById('ownerName').value.trim();

        const email = document.getElementById('signupEmail').value.trim();
        const pass = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;

        // ✅ Validations (Business Name + Type LAZMI!)
        if (!bizName) return showAuthMsg('msgBizName');
        if (!bizType) return showAuthMsg('msgBizType');
        if (pass.length < 6) return showAuthMsg('msgShort');
        if (pass !== confirm) return showAuthMsg('msgNoMatch');

        btnLoading('signupBtn', true);

        try {
            // 1. Pehla user check (pehla = super-admin, baqi = owner)
            let role = 'owner';
            try {
                const usersSnap = await db.collection('users').limit(1).get();
                if (usersSnap.empty) role = 'super-admin';
            } catch (ruleErr) {
                console.warn('Read check:', ruleErr);
            }

            // 2. Firebase Auth — user create
            const cred = await auth.createUserWithEmailAndPassword(email, pass);
            const uid = cred.user.uid;

            // 3. 🆕 AGENCY CREATE (owner ke liye — Free package!)
            let agencyId = null;
            if (role === 'owner') {
                // Free package ki limits fetch karo
                let limits = { monthlyBills: 150, weeklyBills: 50, maxBookers: 2, maxAdmins: 1, dailyOrdersPerBooker: 30 };
                try {
                    const pkgDoc = await db.collection('packages').doc('free').get();
                    if (pkgDoc.exists) limits = pkgDoc.data().limits;
                } catch (e) { /* default limits use hongi */ }

                const agencyRef = await db.collection('agencies').add({
                    name: bizName,
                    businessType: bizType,
                    mobile: bizMobile || '',
                    city: bizCity || '',
                    packageId: 'free',
                    status: 'active',
                    ownerUid: uid,
                    ownerEmail: email,
                    createdAt: new Date().toISOString()
                });
                agencyId = agencyRef.id;
            }

            // 4. User profile save (agency linked!)
            await db.collection('users').doc(uid).set({
                email: email,
                name: ownerName || bizName + ' (Owner)',
                role: role,
                loginMethod: 'email',
                agencyId: role === 'super-admin' ? 'super-admin-hq' : agencyId,
                permissions: { instant: true, stock: true },
                createdAt: new Date().toISOString(),
                createdBy: role === 'super-admin' ? 'system-first' : 'signup'
            });

            // ✅ Success!
            btnLoading('signupBtn', false);
            
            const T2 = T();
            await Swal.fire({
                icon: 'success',
                title: role === 'super-admin' ? T2.msgCreated : T2.msgAgencyDone,
                text: role === 'owner' ? `🏢 ${bizName} — Free Package Active!` : '',
                timer: 3000,
                showConfirmButton: false,
                timerProgressBar: true
            });

            window.location.href = 'dashboard.html';

        } catch (error) {
            btnLoading('signupBtn', false);
            showAuthMsg(translateFirebaseError(error));
            console.error('Signup Error:', error);
        }
    });

    // -------------------------------------------
    // 🔑 LOGIN (Email + Password)
    // -------------------------------------------
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('authMessage').innerText = '';

        if (!firebaseReady) return showAuthMsg('msgFirebaseLoad');

        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPassword').value;

        btnLoading('loginBtn', true);

        try {
            await auth.signInWithEmailAndPassword(email, pass);
            btnLoading('loginBtn', false);
            window.location.href = 'dashboard.html';
        } catch (error) {
            btnLoading('loginBtn', false);
            showAuthMsg(translateFirebaseError(error));
            console.error('Login Error:', error);
        }
    });

    // -------------------------------------------
    // 🌐 GOOGLE LOGIN (Continue with Google)
    // ============================================
    async function handleGoogleLogin() {
        if (!firebaseReady) return showAuthMsg('msgFirebaseLoad');

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            const cred = await auth.signInWithPopup(provider);
            const user = cred.user;
            const uid = user.uid;

            // Check: Pehla user? → Super Admin. Naya? → profile banao
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                // 🆕 Naya Google user — profile banao
                let role = 'owner';
                try {
                    const usersSnap = await db.collection('users').limit(1).get();
                    if (usersSnap.empty) role = 'super-admin';
                } catch (e) {
                    console.warn('Rules read issue:', e);
                }

                const displayName = user.displayName || user.email.split('@')[0];

                await db.collection('users').doc(uid).set({
                    email: user.email,
                    name: displayName,
                    role: role,
                    loginMethod: 'google',
                    agencyId: role === 'super-admin' ? 'super-admin-hq' : null,
                    permissions: { instant: true, stock: true },
                    createdAt: new Date().toISOString()
                });
            }
            // (Profile already hai — sirf login, kuch nahi karna)

            window.location.href = 'dashboard.html';

        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                return; // User ne popup band kiya — koi masla nahi
            }
            if (error.code === 'auth/popup-blocked') {
                // Popup blocked — redirect method try karo
                try {
                    await auth.signInWithRedirect(provider);
                } catch (e2) {
                    showAuthMsg('msgGeneric');
                }
                return;
            }
            console.error('Google Login Error:', error);
            showAuthMsg('msgGeneric');
        }
    }

    const gLoginBtn = document.getElementById('googleLoginBtn');
    if (gLoginBtn) gLoginBtn.addEventListener('click', handleGoogleLogin);

    const gSignupBtn = document.getElementById('googleSignupBtn');
    if (gSignupBtn) gSignupBtn.addEventListener('click', handleGoogleLogin);
    // (Dono buttons same kaam — login/signup auto handle!)

    // -------------------------------------------
    // 🔄 AUTO-LOGIN CHECK (already logged in? → dashboard)
    // -------------------------------------------
    if (firebaseReady) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                window.location.href = 'dashboard.html';
            }
        });
    }

    // -------------------------------------------
    // 🚀 INIT LANGUAGE
    // -------------------------------------------
    setAuthLang(authLang);
});
