// ============================================
// 🎨 EASY BILL GENERATOR — BILL TEMPLATES (v1)
// ✅ 5 Professional Templates:
//    T1: 🇵🇰 Urdu Classic (Nastaliq!)
//    T2: 📋 Traders English (Big Header)
//    T3: 🇵🇰 Urdu + English Mix
//    T4: ⚡ Modern Minimal (Default)
//    T5: 💎 Premium Full (Sab kuch!)
// ✅ Har template: Print/PDF/JPG/Share ke sath!
// ============================================

// ============================================
// 🎨 URDU FONT (Nastaliq!)
// ============================================
function getUrduFontCSS() {
    return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
    .urdu-text { 
        font-family: 'Noto Nastaliq Urdu', serif; 
        direction: rtl; 
        line-height: 2.2;
    }
    `;
}

// ============================================
// 🎯 SHARED DATA HELPERS
// ============================================
function getTemplateAgency(agency) {
    return {
        name: (agency && agency.name) || 'Easy Bill Generator',
        mobile: (agency && agency.mobile) || '',
        address: (agency && agency.address) || '',
        city: (agency && agency.city) || '',
        ntn: (agency && agency.ntn) || '',
        regNo: (agency && agency.regNo) || '',
        logo: (agency && agency.logoBase64) || null
    };
}

function getTemplateCustomer(bill) {
    return {
        name: bill.customerName || 'Counter Sale',
        mobile: bill.customerMobile || '',
        address: (bill.customerAddress) || ''
    };
}

function getTemplateItems(bill) {
    return (bill.items || []).map((it, i) => ({
        sno: i + 1,
        name: it.name,
        qty: it.qty,
        rate: it.rate,
        total: (it.total || 0).toFixed(2)
    }));
}

function getTemplateTotals(bill) {
    return {
        subTotal: (bill.subTotal || 0).toFixed(2),
        discount: (bill.discount || 0).toFixed(2),
        grandTotal: (bill.grandTotal || 0).toFixed(2),
        prevBalance: (bill.previousBalance || 0).toFixed(2),
        received: (bill.received || 0).toFixed(2),
        balance: (bill.balance || 0).toFixed(2)
    };
}

// ============================================
// 🎨 TEMPLATE 1: 🇵🇰 URDU CLASSIC (Nastaliq!)
// DigiKhata-style — Urdu header, seedhi layout
// ============================================
function template1Urdu(bill, agency, customer) {
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            ${getUrduFontCSS()}
            body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                padding: 20px; max-width: 650px; margin: auto; color: #333;
            }
            .urdu-main {
                background: #fff;
                padding: 20px;
                border: 2px solid #333;
                border-radius: 8px;
            }
            .urdu-header {
                text-align: center;
                border-bottom: 3px double #333;
                padding-bottom: 15px;
                margin-bottom: 15px;
            }
            .urdu-title {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 28px;
                font-weight: 700;
                color: #1a1a1a;
                margin: 0;
                line-height: 1.8;
            }
            .urdu-subtitle {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 14px;
                color: #555;
                margin: 5px 0;
            }
            .cash-tag {
                font-size: 22px;
                font-weight: bold;
                color: #2c3e50;
                letter-spacing: 3px;
                text-align: right;
                margin-top: -40px;
            }
            .urdu-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px 20px;
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 14px;
                border: 1px solid #555;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            .urdu-info-item {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                border-bottom: 1px dotted #999;
                padding: 3px 0;
            }
            .urdu-info-label { color: #555; }
            .urdu-info-value { color: #1a1a1a; font-weight: bold; }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-family: 'Noto Nastaliq Urdu', serif;
            }
            th, td {
                border: 1px solid #444;
                padding: 6px 8px;
                text-align: center;
                font-size: 13px;
            }
            th { background: #f0f0f0; font-weight: bold; }
            td.name { text-align: right; }
            .urdu-totals {
                font-family: 'Noto Nastaliq Urdu', serif;
                margin-top: 15px;
            }
            .urdu-total-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 15px;
                font-size: 15px;
            }
            .urdu-total-row.grand {
                border-top: 2px solid #333;
                font-weight: bold;
                font-size: 17px;
                background: #f9f9f9;
            }
            .urdu-total-row.bal { color: #c0392b; font-weight: bold; }
            .urdu-footer {
                text-align: center;
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 12px;
                color: #666;
                margin-top: 20px;
                border-top: 1px solid #ccc;
                padding-top: 10px;
                line-height: 2;
            }
            .sig-area {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                font-family: 'Noto Nastaliq Urdu', serif;
            }
            .sig-box {
                border-top: 1px solid #333;
                width: 140px;
                text-align: center;
                padding-top: 5px;
                font-size: 13px;
            }
        </style>
    </head>
    <body>
        <div class="urdu-main">
            <div class="urdu-header">
                <h1 class="urdu-title">${agency.name}</h1>
                ${agency.address ? `<p class="urdu-subtitle">${agency.address}</p>` : ''}
                ${agency.mobile ? `<p class="urdu-subtitle">📱 ${agency.mobile}</p>` : ''}
                <div class="cash-tag">CASH</div>
            </div>

            <div class="urdu-info-grid">
                <div class="urdu-info-item">
                    <span class="urdu-info-label">بل نمبر:</span>
                    <span class="urdu-info-value">${bill.billNo}</span>
                </div>
                <div class="urdu-info-item">
                    <span class="urdu-info-label">تاریخ:</span>
                    <span class="urdu-info-value">${dateStr}</span>
                </div>
                <div class="urdu-info-item">
                    <span class="urdu-info-label">گاہک کا نام:</span>
                    <span class="urdu-info-value">${customer.name}</span>
                </div>
                <div class="urdu-info-item">
                    <span class="urdu-info-label">موبائل:</span>
                    <span class="urdu-info-value">${customer.mobile || '—'}</span>
                </div>
                <div class="urdu-info-item">
                    <span class="urdu-info-label">پتہ:</span>
                    <span class="urdu-info-value">${customer.address || '—'}</span>
                </div>
                <div class="urdu-info-item">
                    <span class="urdu-info-label">وقت:</span>
                    <span class="urdu-info-value">${timeStr}</span>
                </div>
            </div>

            <table>
                <tr>
                    <th>نمبر</th>
                    <th>تفصیل</th>
                    <th>تعداد</th>
                    <th>ریٹ</th>
                    <th>کل قیمت</th>
                </tr>
                ${items.map(it => `
                <tr>
                    <td>${it.sno}</td>
                    <td class="name">${it.name}</td>
                    <td>${it.qty}</td>
                    <td>Rs ${it.rate}</td>
                    <td>Rs ${it.total}</td>
                </tr>`).join('')}
            </table>

            <div class="urdu-totals">
                <div class="urdu-total-row">
                    <span>ٹوٹل رقم:</span>
                    <span>Rs ${tot.subTotal}</span>
                </div>
                <div class="urdu-total-row">
                    <span>ڈسکاؤنٹ:</span>
                    <span>Rs ${tot.discount}</span>
                </div>
                <div class="urdu-total-row grand">
                    <span>کل واجب الادا:</span>
                    <span>Rs ${tot.grandTotal}</span>
                </div>
                <div class="urdu-total-row">
                    <span>سابقہ بقایا:</span>
                    <span>Rs ${tot.prevBalance}</span>
                </div>
                <div class="urdu-total-row">
                    <span>وصول شدہ:</span>
                    <span>Rs ${tot.received}</span>
                </div>
                <div class="urdu-total-row bal">
                    <span>کل بقایا رقم:</span>
                    <span>Rs ${tot.balance}</span>
                </div>
            </div>

            <div class="sig-area">
                <div class="sig-box">دستخط</div>
                <div class="sig-box">دستخط گاہک</div>
            </div>

            <div class="urdu-footer">
                سیل میں کی گئی ترین کا ادارہ ذمہ دار نہیں ہوگا۔<br>
                براہ کرم بل کی رقم مقررہ تاریخ تک ادا کر دیں۔ شکریہ!<br>
                بل نمبر: ${bill.billNo} — Easy Bill Generator
            </div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 2: 📋 TRADERS ENGLISH (Big Header!)
// Usama Traders style — Bold company header
// ============================================
function template2Traders(bill, agency, customer) {
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 650px; margin: auto; color: #222; }
            .main-header {
                text-align: center;
                border-bottom: 4px solid #222;
                padding-bottom: 12px;
                margin-bottom: 8px;
            }
            .company-name {
                font-size: 36px;
                font-weight: 900;
                letter-spacing: 4px;
                color: #1a1a1a;
                margin: 0;
                text-transform: uppercase;
            }
            .company-sub {
                font-size: 13px;
                color: #555;
                margin: 5px 0 0;
            }
            .cash-tag {
                font-size: 24px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 5px;
                text-align: right;
                margin: -35px 0 10px;
            }
            .top-info {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                margin-bottom: 15px;
            }
            .top-info div { line-height: 1.6; }
            .top-info b { color: #000; }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
                font-size: 13px;
            }
            .items-table th, .items-table td {
                border: 1px solid #333;
                padding: 6px 8px;
                text-align: left;
            }
            .items-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
            .items-table td.num { text-align: right; }
            .summary-table {
                width: 320px;
                margin-left: auto;
                margin-top: 15px;
                font-size: 13px;
            }
            .summary-table div {
                display: flex;
                justify-content: space-between;
                padding: 4px 10px;
            }
            .summary-table .label { font-weight: bold; }
            .summary-table .grand {
                border-top: 2px solid #333;
                font-weight: bold;
                font-size: 15px;
                background: #f9f9f9;
            }
            .summary-table .net {
                font-weight: bold;
                border: 2px solid #333;
                font-size: 14px;
                background: #f0f0f0;
            }
            .sign-area {
                margin-top: 50px;
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                font-weight: bold;
            }
            .sign-box {
                border-top: 2px solid #333;
                width: 150px;
                text-align: center;
                padding-top: 5px;
            }
            .footer {
                text-align: center;
                font-size: 10px;
                color: #666;
                margin-top: 25px;
                border-top: 1px solid #999;
                padding-top: 8px;
            }
        </style>
    </head>
    <body>
        <div class="main-header">
            <h1 class="company-name">${agency.name}</h1>
            ${agency.address ? `<p class="company-sub">${agency.address}</p>` : ''}
            ${agency.mobile ? `<p class="company-sub">Cell: ${agency.mobile}</p>` : ''}
        </div>
        <div class="cash-tag">CASH</div>

        <div class="top-info">
            <div>
                <b>Customer:</b> ${customer.name}<br>
                <b>Address:</b> ${customer.address || '-'}<br>
                <b>Contacts:</b> ${customer.mobile || '-'}
            </div>
            <div style="text-align: right;">
                <b>Invoice No:</b> ${bill.billNo}<br>
                <b>Inv. Date:</b> ${dateStr}<br>
                <b>Time:</b> ${timeStr}
            </div>
        </div>

        <table class="items-table">
            <tr>
                <th>Item</th>
                <th>Ctn-Box-Units</th>
                <th>Bonus</th>
                <th>Rate</th>
                <th>T. Off</th>
                <th>Extended</th>
            </tr>
            ${items.map(it => `
            <tr>
                <td>${it.name}</td>
                <td style="text-align:center;">1 - 0 - ${it.qty}</td>
                <td style="text-align:center;">0</td>
                <td class="num">Rs ${it.rate}</td>
                <td style="text-align:center;">0.00</td>
                <td class="num">Rs ${it.total}</td>
            </tr>`).join('')}
            <tr>
                <td colspan="5" style="text-align:right; font-weight:bold;">Totals:</td>
                <td class="num" style="font-weight:bold;">Rs ${tot.subTotal}</td>
            </tr>
        </table>

        <div class="summary-table">
            <div><span class="label">Amount:</span><span>Rs ${tot.subTotal}</span></div>
            <div><span class="label">Other Charges:</span><span>Rs 0.00</span></div>
            <div><span class="label">Discount:</span><span>- Rs ${tot.discount}</span></div>
            <div class="net"><span class="label">Net Amount:</span><span>Rs ${tot.grandTotal}</span></div>
            <div><span class="label">Previous Balance:</span><span>Rs ${tot.prevBalance}</span></div>
            <div class="net"><span class="label">Total Balance:</span><span>Rs ${tot.balance}</span></div>
        </div>

        <div class="sign-area">
            <div class="sign-box">Prepared By</div>
            <div class="sign-box">Received By</div>
        </div>

        <div class="footer">
            (Sales &amp; Distribution App) Developed by Easy Bill Generator<br>
            Page 1 of 1
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 3: 🇵🇰 URDU + ENGLISH MIX
// Taj Traders style — Urdu header + English data
// ============================================
function template3Mix(bill, agency, customer) {
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            ${getUrduFontCSS()}
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 650px; margin: auto; color: #222; }
            .main-header {
                text-align: center;
                border-bottom: 3px solid #222;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            .urdu-company {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 30px;
                font-weight: 700;
                margin: 0;
                line-height: 1.8;
            }
            .eng-sub {
                font-size: 13px;
                color: #555;
                font-family: 'Segoe UI', Arial;
                margin: 5px 0;
            }
            .cash-tag {
                font-size: 22px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 4px;
                text-align: right;
                margin: -45px 0 10px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                margin-bottom: 10px;
            }
            .info-row .urdu-label {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-weight: bold;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 13px;
            }
            .items-table th, .items-table td {
                border: 1px solid #333;
                padding: 6px 8px;
            }
            .items-table th { background: #f0f0f0; text-align: center; }
            .items-table td.name {
                font-family: 'Noto Nastaliq Urdu', serif;
                text-align: right;
            }
            .urdu-totals {
                margin-top: 10px;
                max-width: 350px;
                margin-left: auto;
            }
            .urdu-total-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 12px;
                font-size: 14px;
            }
            .urdu-total-row .urdu-label {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-weight: bold;
            }
            .urdu-total-row.grand {
                border-top: 2px solid #333;
                font-weight: bold;
                background: #f9f9f9;
            }
            .urdu-total-row.bal { color: #c0392b; font-weight: bold; }
            .urdu-terms {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 12px;
                margin-top: 20px;
                border: 1px solid #999;
                padding: 10px;
                border-radius: 6px;
                line-height: 2;
            }
            .sign-area {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                font-family: 'Noto Nastaliq Urdu', serif;
            }
            .sign-box {
                border-top: 1px solid #333;
                width: 140px;
                text-align: center;
                padding-top: 5px;
            }
        </style>
    </head>
    <body>
        <div class="main-header">
            <h1 class="urdu-company">${agency.name}</h1>
            ${agency.address ? `<p class="eng-sub">${agency.address}</p>` : ''}
            ${agency.mobile ? `<p class="eng-sub">Cell: ${agency.mobile}</p>` : ''}
        </div>
        <div class="cash-tag">CASH</div>

        <div class="info-row">
            <div>
                <span class="urdu-label">گاہک کا نام:</span> ${customer.name}<br>
                <span class="urdu-label">موبائل:</span> ${customer.mobile || '-'}
            </div>
            <div style="text-align: right;">
                <b>Bill No:</b> ${bill.billNo}<br>
                <b>Date:</b> ${dateStr}
            </div>
        </div>

        <table class="items-table">
            <tr>
                <th>تفصیل</th>
                <th>تعداد</th>
                <th>ریٹ</th>
                <th>کل قیمت</th>
            </tr>
            ${items.map(it => `
            <tr>
                <td class="name">${it.name}</td>
                <td style="text-align:center;">${it.qty}</td>
                <td style="text-align:center;">Rs ${it.rate}</td>
                <td style="text-align:center;">Rs ${it.total}</td>
            </tr>`).join('')}
            <tr>
                <td colspan="3" style="text-align:left; font-weight:bold;">
                    <span class="urdu-label" style="font-family:'Noto Nastaliq Urdu',serif;">ٹوٹل:</span>
                </td>
                <td style="text-align:center; font-weight:bold;">Rs ${tot.grandTotal}</td>
            </tr>
        </table>

        <div class="urdu-totals">
            <div class="urdu-total-row">
                <span class="urdu-label">سابقہ بقایا:</span>
                <span>Rs ${tot.prevBalance}</span>
            </div>
            <div class="urdu-total-row">
                <span class="urdu-label">وصول شدہ:</span>
                <span>Rs ${tot.received}</span>
            </div>
            <div class="urdu-total-row bal">
                <span class="urdu-label">کل بقایا:</span>
                <span>Rs ${tot.balance}</span>
            </div>
        </div>

        <div class="urdu-terms">
            سیل میں کی گئی ترین کا ادارہ ذمہ دار نہیں ہوگا۔ براہ کرم بل کی رقم مقررہ تاریخ تک ادا کر دیں۔ شکریہ!
        </div>

        <div class="sign-area">
            <div class="sign-box">دستخط</div>
            <div class="sign-box">دستخط گاہک</div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 4: ⚡ MODERN MINIMAL (Default!)
// v4 — Title BIG + 👤 OWNER NAME (Title nechay!) + Line: Mobiles→NTN→Licence
// ============================================
function template4Modern(bill, agency, customer) {
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const payType = bill.payType || (agency.payType || 'CASH');

    // 🆕 OWNER NAME + PERSONAL MOBILE (naam ke baad thora space!)
    const ownerNm = String(agency.ownerName || '').trim();
    const ownerMob = String(agency.ownerMobile || '').trim();
    const ownerBits = [];
    if (ownerNm) ownerBits.push(`👤 ${ownerNm}`);
    if (ownerMob) ownerBits.push(`📱 ${ownerMob}`);
    const ownerHTML = ownerBits.join('&nbsp;&nbsp;&nbsp;');
    
    
    
    // 📱 SIRF 2 MOBILES — jo bhare hon
    const mobilesArr = [agency.mobile, agency.mobile2]
        .filter(m => m && String(m).trim())
        .map(m => `📱 ${String(m).trim()}`);

    // 🆕 Contact LINE: Mobiles PEHLE → phir NTN → phir Licence
    const contactBits = [];
    if (mobilesArr.length > 0) contactBits.push(mobilesArr.join('&nbsp;&nbsp;'));
    if (agency.ntn && String(agency.ntn).trim()) contactBits.push(`🔢 NTN: ${agency.ntn}`);
    if (agency.licenceNo && String(agency.licenceNo).trim()) contactBits.push(`📋 Licence: ${agency.licenceNo}`);
    const contactHTML = contactBits.join(' &nbsp;|&nbsp; ');

    // 📍 Address + City (sirf bhari hon to show!)
    const addrParts = [agency.address, agency.city].filter(a => a && String(a).trim());
    const addrHTML = addrParts.length ? `📍 ${addrParts.join(', ')}` : '';

    // 💰 Tax row
    const taxRow = (bill.taxAmount && bill.taxAmount > 0)
        ? `<div><span>Tax (${bill.taxRate || 0}%):</span><span>+ Rs ${bill.taxAmount.toFixed(2)}</span></div>`
        : '';

    return `
    <html>
    <head>
        <title>Bill ${bill.billNo}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 650px; margin: auto; color: #333; }

            /* 🏢 AGENCY HEADER */
            .ag-header {
                display: flex;
                align-items: flex-start;
                border-bottom: 3px double #333;
                padding-bottom: 8px;
                margin-bottom: 12px;
            }
            .ag-logo { flex: 0 0 auto; display: flex; align-items: center; }
            .ag-logo img { width: 55px; height: 50px; object-fit: contain; }
            .ag-details { flex: 1; text-align: left; padding: 0 10px; min-width: 0; }

            /* 🏢 TITLE — BARA (24px) + auto-shrink! */
            .ag-name-row { white-space: nowrap; overflow: hidden; }
            .ag-name {
                font-size: 24px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 0.3px;
                display: inline-block;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* 🆕 OWNER NAME line (Title nechay — bold!) */
            .ag-owner-line { font-size: 12.5px; color: #1a1a1a; font-weight: 800; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* 📍 Choti line (Address+City) */
            .ag-sub-line { font-size: 10.5px; color: #555; font-weight: 600; margin-top: 2px; word-wrap: break-word; }

            /* 📱🔢 Contact LINE: Mobiles + NTN + Licence */
            .ag-contact-line {
                font-size: 11px;
                color: #333;
                font-weight: bold;
                margin-top: 3px;
                word-wrap: break-word;
            }

            /* 💳 PAY TYPE (right top — bold!) */
            .pay-type {
                flex: 0 0 auto;
                align-self: center;
                font-size: 22px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 3px;
            }

            /* 🧾 BILL META (grey rounded — right side!) */
            .bill-meta-inner {
                background: #f8f9fa;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 12px;
                line-height: 1.9;
                min-width: 160px;
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

            /* 💰 TOTALS */
            .totals {
                margin-top: 12px;
                max-width: 340px;
                margin-left: auto;
                background: #fafbfc;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 8px 15px;
            }
            .totals div { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 14px; }
            .totals .grand { border-top: 2px solid #333; font-weight: bold; font-size: 15px; }
            .totals .bal { color: #c0392b; font-weight: bold; }

            .thanks { text-align: center; font-weight: bold; margin-top: 15px; color: #2c3e50; }
            .sig-area { margin-top: 40px; text-align: right; }
            .sig-line { border-top: 1px solid #333; width: 160px; display: inline-block; padding-top: 5px; font-weight: bold; }
            .footer-note { text-align: center; font-size: 10px; color: #888; margin-top: 25px; font-style: italic; }
        </style>
    </head>
    <body>
        <!-- 🏢 AGENCY HEADER (Title → OWNER → Address → Mobiles+NTN+Licence) -->
        <div class="ag-header">
            ${agency.logo ? `<div class="ag-logo"><img src="${agency.logo}"></div>` : ''}
            <div class="ag-details">
                <div class="ag-name-row">
                    <span class="ag-name" id="agName">${agency.name}</span>
                </div>
                ${ownerHTML ? `<div class="ag-owner-line">${ownerHTML}</div>` : ''}
                ${addrHTML ? `<div class="ag-sub-line">${addrHTML}</div>` : ''}
                ${contactHTML ? `<div class="ag-contact-line">${contactHTML}</div>` : ''}
            </div>
            <div class="pay-type">${payType}</div>
        </div>

        <!-- 👤 CUSTOMER BOX -->
        <div class="cust-box">
            <div class="cust-left">
                <span class="cust-label">👤 Customer:</span>
                <span class="cust-name-big"> ${customer.name}</span>
                ${customer.mobile ? `<span> &nbsp; 📱 ${customer.mobile}</span>` : ''}
                ${customer.address ? `<br><span class="cust-label">📍 Address:</span> <span class="cust-addr"> ${customer.address}</span>` : ''}
                ${bill.customerNTN ? `<br><span class="cust-label">🔢 NTN:</span> <span class="dim-value"> ${bill.customerNTN}</span>` : ''}
            </div>
            <div class="cust-right">
                <div class="bill-meta-inner">
                    <b>🧾 Bill No:</b> ${bill.billNo}<br>
                    <b>📅 Date:</b> ${dateStr}<br>
                    <b>🕐 Time:</b> ${timeStr}
                </div>
            </div>
        </div>

        <table>
            <tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            ${items.map(it => `
                <tr>
                    <td>${it.sno}</td>
                    <td>${it.name}</td>
                    <td class="qty">${it.qty}</td>
                    <td class="rate">Rs ${it.rate}</td>
                    <td class="total">Rs ${it.total}</td>
                </tr>`).join('')}
        </table>

        <div class="totals">
            <div><span>Sub Total:</span><span>Rs ${tot.subTotal}</span></div>
            <div><span>Discount:</span><span>- Rs ${tot.discount}</span></div>
            ${taxRow}
            <div class="grand"><span>Grand Total:</span><span>Rs ${tot.grandTotal}</span></div>
            <div><span>Previous Balance:</span><span>Rs ${tot.prevBalance}</span></div>
            <div><span>Received:</span><span>- Rs ${tot.received}</span></div>
            <div class="bal"><span>TOTAL BALANCE:</span><span>Rs ${tot.balance}</span></div>
        </div>

        <div class="thanks">🙏 Shukriya! Dobara tashreef layen!</div>

        <div class="sig-area">
            <div class="sig-line">Authorized Signature</div>
        </div>

        <div class="footer-note">Bill ${bill.billNo} — Easy Bill Generator se generate hua hai.</div>

        <!-- 🌟 AUTO-SHRINK (24px se shuru — naam lamba to chota!) -->
        <script>
            (function() {
                function fitName() {
                    try {
                        var nameEl = document.getElementById('agName');
                        if (!nameEl) return;
                        var size = 24;
                        nameEl.style.fontSize = size + 'px';
                        var guard = 0;
                        while (nameEl.scrollWidth > nameEl.clientWidth && size > 10 && guard < 50) {
                            size -= 0.5;
                            nameEl.style.fontSize = size + 'px';
                            guard++;
                        }
                    } catch (e) {}
                }
                window.addEventListener('load', fitName);
                setTimeout(fitName, 100);
            })();
        <\/script>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 5: 💎 PREMIUM FULL (Sab Kuch!)
// Logo + Urdu + English + Salesman + Bonus + Pack detail
// ============================================
function template5Premium(bill, agency, customer) {
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const logoHtml = agency.logo 
        ? `<img src="${agency.logo}" style="max-width:100px; max-height:100px; margin-bottom:8px;">`
        : '<div style="font-size:50px;">⚡</div>';

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            ${getUrduFontCSS()}
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 700px; margin: auto; color: #222; }
            .premium-header {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: #fff;
                padding: 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .premium-header .biz-info { text-align: left; }
            .premium-header h1 { margin: 0 0 5px 0; font-size: 24px; }
            .premium-header p { margin: 2px 0; font-size: 12px; opacity: 0.9; }
            .premium-header .logo { text-align: right; }
            .bill-type-badge {
                background: var(--warning, #f39c12);
                color: #fff;
                padding: 5px 20px;
                border-radius: 0 0 12px 12px;
                display: inline-block;
                font-weight: bold;
                font-size: 14px;
                letter-spacing: 2px;
            }
            .meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
                background: #f8f9fa;
                padding: 12px;
                border-radius: 8px;
                margin: 12px 0;
                font-size: 12px;
            }
            .meta-grid div { line-height: 1.6; }
            .meta-grid b { color: #2c3e50; }
            .cust-section {
                display: flex;
                gap: 15px;
                background: #eef2f7;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 12px;
                font-size: 13px;
            }
            .cust-section div { flex: 1; line-height: 1.6; }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 12px;
            }
            .items-table th, .items-table td {
                border: 1px solid #444;
                padding: 6px 8px;
                text-align: left;
            }
            .items-table th { background: #2c3e50; color: #fff; text-align: center; font-size: 11px; }
            .items-table td.num { text-align: right; }
            .items-table td.center { text-align: center; }
            .pack-detail { font-size: 10px; color: #666; font-style: italic; }
            .totals-premium {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 12px 18px;
                max-width: 380px;
                margin-left: auto;
                margin-top: 15px;
            }
            .totals-premium div {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                font-size: 13px;
            }
            .totals-premium .grand {
                border-top: 2px solid #2c3e50;
                font-weight: bold;
                font-size: 16px;
                color: #2c3e50;
            }
            .totals-premium .bal { color: #c0392b; font-weight: bold; }
            .urdu-note {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 12px;
                text-align: center;
                margin-top: 20px;
                line-height: 2.2;
                color: #555;
                border-top: 1px solid #ccc;
                padding-top: 10px;
            }
            .sig-premium {
                margin-top: 35px;
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                font-weight: bold;
            }
            .sig-premium .box {
                border-top: 2px solid #2c3e50;
                width: 150px;
                text-align: center;
                padding-top: 5px;
            }
        </style>
    </head>
    <body>
        <div class="premium-header">
            <div class="biz-info">
                <h1>${agency.name}</h1>
                ${agency.address ? `<p>📍 ${agency.address}</p>` : ''}
                ${agency.mobile ? `<p>📱 ${agency.mobile}</p>` : ''}
                ${agency.ntn ? `<p>🔢 NTN: ${agency.ntn}</p>` : ''}
            </div>
            <div class="logo">${logoHtml}</div>
        </div>
        <div style="text-align:center;"><span class="bill-type-badge">CASH / CREDIT</span></div>

        <div class="meta-grid">
            <div><b>🧾 Bill No:</b> ${bill.billNo}</div>
            <div><b>📅 Date:</b> ${dateStr}</div>
            <div><b>🕐 Time:</b> ${timeStr}</div>
            ${bill.salesMan ? `<div><b>👤 Sales Man:</b> ${bill.salesMan}</div>` : ''}
            ${bill.route ? `<div><b>🛣️ Route:</b> ${bill.route}</div>` : ''}
            <div><b>📦 Items:</b> ${(bill.items || []).length}</div>
        </div>

        <div class="cust-section">
            <div>
                <b>👤 Customer:</b> ${customer.name}<br>
                ${customer.address ? `📍 ${customer.address}` : ''}
            </div>
            <div>
                ${customer.mobile ? `<b>📱</b> ${customer.mobile}` : ''}
            </div>
        </div>

        <table class="items-table">
            <tr>
                <th>Item</th>
                <th>Pack</th>
                <th>Ctn-Box-Units</th>
                <th>Bonus</th>
                <th>Rate</th>
                <th>Disc%</th>
                <th>Extended</th>
            </tr>
            ${items.map(it => `
            <tr>
                <td>${it.name}</td>
                <td class="center">${it.packSize || '—'}</td>
                <td class="center">1 - 0 - ${it.qty}</td>
                <td class="center">${it.bonus || 0}</td>
                <td class="num">Rs ${it.rate}</td>
                <td class="center">0.00%</td>
                <td class="num">Rs ${it.total}</td>
            </tr>`).join('')}
            <tr>
                <td colspan="6" style="text-align:right; font-weight:bold;">Totals:</td>
                <td class="num" style="font-weight:bold;">Rs ${tot.subTotal}</td>
            </tr>
        </table>

        <div class="totals-premium">
            <div><span>Sub Total:</span><span>Rs ${tot.subTotal}</span></div>
            <div><span>Discount:</span><span>- Rs ${tot.discount}</span></div>
            <div class="grand"><span>Grand Total:</span><span>Rs ${tot.grandTotal}</span></div>
            <div><span>Previous Balance:</span><span>Rs ${tot.prevBalance}</span></div>
            <div><span>Received:</span><span>- Rs ${tot.received}</span></div>
            <div class="bal"><span>TOTAL BALANCE:</span><span>Rs ${tot.balance}</span></div>
        </div>

        <div class="urdu-note">
            سیل میں کی گئی ترین کا ادارہ ذمہ دار نہیں ہوگا۔ براہ کرم بل کی رقم مقررہ تاریخ تک ادا کر دیں۔ شکریہ!
        </div>

        <div class="sig-premium">
            <div class="box">Prepared By</div>
            <div class="box">Authorized Signature</div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎯 TEMPLATE REGISTRY (Naam → Function!)
// ============================================
const BILL_TEMPLATES = {
    'template1': { name: '🇵🇰 Urdu Classic', fn: template1Urdu },
    'template2': { name: '📋 Traders English', fn: template2Traders },
    'template3': { name: '🇵🇰 Urdu + English Mix', fn: template3Mix },
    'template4': { name: '⚡ Modern Minimal', fn: template4Modern },
    'template5': { name: '💎 Premium Full', fn: template5Premium }
};

const DEFAULT_TEMPLATE = 'template4';

// ============================================
// 🎯 MAIN RENDERER (Agency template use kare!)
// ============================================
function renderBillTemplate(bill) {
    const agency = myAgency || {};
    const customer = getTemplateCustomer(bill);
    const templateId = agency.template || DEFAULT_TEMPLATE;
    const template = BILL_TEMPLATES[templateId] || BILL_TEMPLATES[DEFAULT_TEMPLATE];
    
    return template.fn(bill, agency, customer);
}