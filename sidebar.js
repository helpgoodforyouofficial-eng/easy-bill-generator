// ============================================
// 🧭 EASY BILL GENERATOR — SIDEBAR SYSTEM (v1)
// ✅ Mobile: Hamburger + slide-in
// ✅ PC: Permanent sidebar (250px)
// ✅ Profile: Sidebar neeche + Top-right avatar
// ✅ Role-aware menu (Booker ko limited)
// ============================================

(function initSidebar() {
    // Page load ke turant baad inject karo (DOMContentLoaded ki zaroorat nahi —
    // ye file body ke end mein include hogi!)
    
    // 1️⃣ CONFIG: Menu items (title groups ke sath!)
    const MENU = [
        {
            title: 'MAIN',
            items: [
                { icon: 'fa-chart-line', text: 'Dashboard', url: 'dashboard.html', roles: ['super-admin', 'owner', 'booker'] },
                { icon: 'fa-bolt', text: 'Instant Bills', url: '#', roles: ['super-admin', 'owner'], phase: 'PHASE 4' },
                { icon: 'fa-boxes-stacked', text: 'Bill from Stock', url: '#', roles: ['super-admin', 'owner'], phase: 'PHASE 4' },
            ]
        },
        {
            title: 'MANAGEMENT',
            items: [
                { icon: 'fa-boxes-stacked', text: 'Stock Manager', url: 'stock.html', roles: ['super-admin', 'owner'] },
                { icon: 'fa-user-friends', text: 'Customers', url: 'customers.html', roles: ['super-admin', 'owner'] },
                { icon: 'fa-users', text: 'Order Bookers', url: 'owner.html', roles: ['owner'] },
                { icon: 'fa-building', text: 'Agencies', url: 'admin.html', roles: ['super-admin'] },
            ]
        },
        {
            title: 'REPORTS',
            items: [
                { icon: 'fa-chart-column', text: 'Sales Reports', url: '#', roles: ['super-admin', 'owner'], phase: 'PHASE 5' },
                { icon: 'fa-trophy', text: 'Best Sellers', url: '#', roles: ['super-admin', 'owner'], phase: 'PHASE 5' },
                { icon: 'fa-hourglass-half', text: 'Slow Items', url: '#', roles: ['super-admin', 'owner'], phase: 'PHASE 5' },
            ]
        },
        {
            title: 'SETTINGS',
            items: [
                { icon: 'fa-cloud-arrow-up', text: 'Backup & Restore', url: '#', roles: ['super-admin', 'owner'], phase: 'PHASE 6' },
                { icon: 'fa-gear', text: 'Settings', url: '#', roles: ['super-admin', 'owner'], phase: 'COMING' },
            ]
        }
    ];

    // 2️⃣ CSS INJECT (style alag file mein bhi ho sakte — lekin 
    //    sidebar khud-proof banane ke liye yahan bhi dalte hain)
    const style = document.createElement('style');
    style.textContent = `
        /* ========== SIDEBAR STYLES ========== */
        .eb-sidebar {
            position: fixed;
            top: 0; left: -280px;
            width: 270px; height: 100vh;
            background: #2c3e50;
            color: #fff;
            z-index: 99998;
            transition: left 0.3s ease;
            overflow-y: auto;
            box-shadow: 5px 0 20px rgba(0,0,0,0.3);
        }
        .eb-sidebar.open { left: 0; }
        
        .eb-sidebar-header {
            padding: 20px 18px 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .eb-sidebar-brand {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 8px;
        }
        .eb-sidebar-logo {
            background: #27ae60;
            width: 40px; height: 40px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
        }
        .eb-sidebar-appname { font-size: 16px; font-weight: bold; }
        .eb-sidebar-agency {
            font-size: 12px; 
            color: #bdc3c7;
            padding-left: 50px;
            word-break: break-word;
        }
        .eb-sidebar-version {
            font-size: 10px;
            color: #7f8c8d;
            padding-left: 50px;
        }

        .eb-menu-section-title {
            font-size: 10px;
            letter-spacing: 2px;
            color: #7f8c8d;
            padding: 18px 18px 8px;
            font-weight: bold;
        }
        .eb-menu-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 18px;
            color: #dfe6e9;
            text-decoration: none;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.15s;
            border-left: 3px solid transparent;
        }
        .eb-menu-item:hover { background: rgba(255,255,255,0.08); }
        .eb-menu-item.active {
            background: rgba(39,174,96,0.2);
            border-left-color: #27ae60;
            color: #fff;
            font-weight: bold;
        }
        .eb-menu-item i { width: 20px; text-align: center; font-size: 15px; }
        .eb-menu-item .eb-phase-tag {
            margin-left: auto;
            font-size: 9px;
            background: #f39c12;
            color: #fff;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: bold;
        }
        .eb-menu-item.locked { opacity: 0.6; }

        /* Profile section (sidebar neeche) */
        .eb-sidebar-profile {
            padding: 15px 18px;
            border-top: 1px solid rgba(255,255,255,0.1);
            margin-top: 10px;
        }
        .eb-profile-link {
            display: flex; align-items: center; gap: 12px;
            color: #dfe6e9; text-decoration: none;
            font-size: 14px;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.15s;
        }
        .eb-profile-link:hover { background: rgba(255,255,255,0.08); }

        /* ========== OVERLAY (mobile) ========== */
        .eb-sidebar-overlay {
            position: fixed;
            top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5);
            z-index: 99997;
            display: none;
        }
        .eb-sidebar-overlay.show { display: block; }

        /* ========== HAMBURGER (mobile) ========== */
        .eb-hamburger {
            position: fixed;
            top: 12px; left: 12px;
            width: 44px; height: 44px;
            background: #2c3e50;
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            z-index: 99996;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        /* ========== PROFILE AVATAR (top-right — DigiKhata style!) ========== */
        .eb-profile-avatar {
            position: fixed;
            top: 12px; right: 12px;
            width: 44px; height: 44px;
            background: #27ae60;
            color: #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
            z-index: 99996;
            cursor: pointer;
            text-decoration: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.5);
            transition: transform 0.2s;
        }
        .eb-profile-avatar:hover { transform: scale(1.1); }

        /* ========== PC: PERMANENT SIDEBAR ========== */
        @media (min-width: 992px) {
            .eb-sidebar { left: 0; }
            .eb-sidebar-overlay { display: none !important; }
            .eb-hamburger { display: none !important; }
            /* Content ko side mein dhakelna */
            .eb-page-content {
                margin-left: 270px;
                padding-top: 0 !important;
            }
            .eb-profile-avatar {
                right: 20px;
                top: 15px;
            }
        }

        /* Mobile par content hamburger ki jagah */
        .eb-page-content {
            padding-top: 60px;
        }
    `;
    document.head.appendChild(style);

    // 3️⃣ PROFILE DATA FETCH (naam + role ke liye)
    let myProfile = { name: 'User', role: 'owner', agencyName: '' };
    
    // Firebase check (agar page par SDK loaded hai)
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    myProfile = doc.data();
                } else {
                    myProfile.name = user.email.split('@')[0];
                }
                renderSidebar();
                updateAvatar();
            } catch (e) {
                console.warn('Sidebar profile fetch:', e);
                renderSidebar();
            }
        });
    } else {
        renderSidebar();
    }

    // 4️⃣ SIDEBAR RENDER
    function renderSidebar() {
        // Purana ho to hatao (double render se bachne ke liye)
        if (document.getElementById('ebSidebar')) return;

        const role = myProfile.role || 'owner';
        const currentPath = window.location.pathname.split('/').pop();

        // Sidebar HTML
        const sidebar = document.createElement('div');
        sidebar.className = 'eb-sidebar';
        sidebar.id = 'ebSidebar';

        let menuHtml = `<div class="eb-sidebar-header">
            <div class="eb-sidebar-brand">
                <div class="eb-sidebar-logo">⚡</div>
                <div class="eb-sidebar-appname">Easy Bill Generator</div>
            </div>
            <div class="eb-sidebar-agency">🏢 ${myProfile.agencyName || myProfile.name || 'My Business'}</div>
            <div class="eb-sidebar-version">Version 1.0</div>
        </div>`;

        MENU.forEach(section => {
            // Role filter — is role ko allowed items?
            const allowedItems = section.items.filter(it => it.roles.includes(role));
            if (allowedItems.length === 0) return;

            menuHtml += `<div class="eb-menu-section-title">${section.title}</div>`;
            
            allowedItems.forEach(item => {
                const isActive = currentPath === item.url ? 'active' : '';
                const locked = item.url === '#' ? 'locked' : '';
                const phaseTag = item.phase ? `<span class="eb-phase-tag">${item.phase}</span>` : '';
                
                menuHtml += `
                <a class="eb-menu-item ${isActive} ${locked}" ${item.url !== '#' ? `href="${item.url}"` : ''}>
                    <i class="fas ${item.icon}"></i>
                    <span>${item.text}</span>
                    ${phaseTag}
                </a>`;
            });
        });

        // Profile + Logout (sidebar neeche)
        menuHtml += `
        <div class="eb-sidebar-profile">
            <a class="eb-profile-link" href="profile.html">
                <i class="fas fa-user-circle" style="font-size:20px;"></i>
                <span>My Profile</span>
            </a>
            <a class="eb-profile-link" href="#" id="ebSidebarLogout">
                <i class="fas fa-sign-out-alt" style="font-size:20px; color:#e74c3c;"></i>
                <span style="color:#e74c3c;">Logout</span>
            </a>
        </div>`;

        sidebar.innerHTML = menuHtml;
        document.body.appendChild(sidebar);

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'eb-sidebar-overlay';
        overlay.id = 'ebSidebarOverlay';
        document.body.appendChild(overlay);

        // Hamburger (mobile)
        const hamburger = document.createElement('button');
        hamburger.className = 'eb-hamburger';
        hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(hamburger);

        // Profile Avatar (top-right — DigiKhata style!)
        const avatar = document.createElement('a');
        avatar.className = 'eb-profile-avatar';
        avatar.href = 'profile.html';
        avatar.title = 'My Profile';
        avatar.innerText = '👤';
        document.body.appendChild(avatar);

        // Toggle events
        const toggleSidebar = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        };
        hamburger.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);

        // Logout event
        const logoutLink = document.getElementById('ebSidebarLogout');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const result = await Swal.fire({
                    title: 'Logout?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#e74c3c',
                    confirmButtonText: 'Haan',
                    cancelButtonText: 'Cancel'
                });
                if (result.isConfirmed && typeof firebase !== 'undefined') {
                    await firebase.auth().signOut();
                    window.location.href = 'auth.html';
                }
            });
        }

        // Content ko shift karo (PC sidebar ke liye) + mobile hamburger space
        // Saari main containers ko class do
        document.querySelectorAll('.panel-container, .panel-topbar').forEach(el => {
            el.classList.add('eb-page-content');
        });
    }

    // 5️⃣ AVATAR UPDATE (pehla letter — naam se!)
    function updateAvatar() {
        const avatar = document.querySelector('.eb-profile-avatar');
        if (avatar && myProfile.name) {
            avatar.innerText = myProfile.name.charAt(0).toUpperCase();
        }
    }

    // 6️⃣ EXPORT (agar kahin se call karna ho)
    window.ebSidebar = { refresh: renderSidebar };
})();
