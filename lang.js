const langDict = {
    // Top Bar & Menus
    "Admin Paneli": "Admin Panel",
    "Barista Paneli": "Barista Panel",
    "Dashboard": "Dashboard",
    "Geçmiş Raporlar": "Past Reports",
    "Canlı": "Live",
    "Toplam Sipariş": "Total Orders",
    "Toplam Gelir": "Total Revenue",
    "Ortalama Sipariş": "Avg Order",
    "Bekleyen Sipariş": "Pending Orders",
    "Günün Siparişleri": "Today's Orders",
    "Günsonu Yap": "End Day",
    "Geçmiş Günsonu Raporları": "Past EOD Reports",
    "Henüz günsonu raporu yok": "No EOD reports yet",
    "Henüz sipariş yok": "No orders yet",
    
    // Admin Table Headers
    "Sipariş No": "Order No",
    "Masa": "Table",
    "Müşteri": "Customer",
    "Ürünler": "Products",
    "Ödeme": "Payment",
    "Tutar": "Amount",
    "Durum": "Status",
    "Saat": "Time",
    "İptal": "Cancel",
    "İptal Et": "Cancel",
    "Onayla": "Confirm",
    "Kapat": "Close",
    "Tamam": "OK",
    
    // Barista Statuses
    "Yeni Sipariş": "New Order",
    "Hazırlanıyor": "Preparing",
    "Hazır": "Ready",
    "Teslim Edildi": "Delivered",
    
    // Payment Methods
    "kredi_karti": "Credit Card",
    "nakit": "Cash",

    // Products & Sizes
    "Türk Kahvesi": "Turkish Coffee",
    "Espresso": "Espresso",
    "Cappuccino": "Cappuccino",
    "Latte": "Latte",
    "Americano": "Americano",
    "Flat White": "Flat White",
    "Iced Latte": "Iced Latte",
    "Cold Brew": "Cold Brew",
    "Frappuccino": "Frappuccino",
    "Iced Americano": "Iced Americano",
    "Caramel Macchiato": "Caramel Macchiato",
    "Mocha": "Mocha",
    "Lavanta Latte": "Lavender Latte",
    "Matcha Latte": "Matcha Latte",
    "Affogato": "Affogato",
    "Tiramisu": "Tiramisu",
    "Cheesecake": "Cheesecake",
    "Brownie": "Brownie",
    "Croissant": "Croissant",
    "Sandviç": "Sandwich",
    "Cookie": "Cookie",
    "Tek": "Single",
    "Çift": "Double",
    "Dilim": "Slice",
    "Sade": "Plain",
    "Çikolatalı": "Chocolate",
    "Normal": "Regular",
    "Büyük": "Large",
    "3'lü": "3-Pack"
};

let currentLang = localStorage.getItem("appLang") || "TR";

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("appLang", lang);
    location.reload(); // Simplest way without breaking apps is to reload and let mutation observer handle initial render
}

function translateNode(node) {
    if (currentLang === "TR") return;
    if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent.trim();
        if (text === "") return;
        
        let translated = text;
        
        // Direct match
        if (langDict[text]) {
            node.textContent = node.textContent.replace(text, langDict[text]);
            return;
        }

        // Substring match for dynamic text like "Türk Kahvesi - Tek"
        for (const [tr, en] of Object.entries(langDict)) {
            if (translated.includes(tr)) {
                // regex match whole word or phrase
                const regex = new RegExp(tr, 'g');
                translated = translated.replace(regex, en);
            }
        }
        
        if (translated !== text) {
            node.textContent = node.textContent.replace(text, translated);
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
        // Translate placeholders
        if (node.hasAttribute("placeholder")) {
            const p = node.getAttribute("placeholder");
            if (langDict[p]) node.setAttribute("placeholder", langDict[p]);
        }
        node.childNodes.forEach(translateNode);
    }
}

// Intercept all future changes (orders loading via API)
const observer = new MutationObserver(mutations => {
    if (currentLang === "TR") return;
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            translateNode(node);
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // Initial translation
    translateNode(document.body);
    
    // Start observing
    if (currentLang === "EN") {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Inject language switcher UI
    const topbars = document.querySelectorAll(".topbar-right, .header-right");
    topbars.forEach(tb => {
        const switcher = document.createElement("div");
        switcher.style.display = "flex";
        switcher.style.gap = "8px";
        switcher.style.marginLeft = "15px";
        switcher.style.marginRight = "15px";
        switcher.style.alignItems = "center";
        
        const fwTr = currentLang === "TR" ? "bold" : "normal";
        const opTr = currentLang === "TR" ? "1" : "0.6";
        const fwEn = currentLang === "EN" ? "bold" : "normal";
        const opEn = currentLang === "EN" ? "1" : "0.6";

        switcher.innerHTML = `
            <span style="cursor:pointer; font-weight:${fwTr}; opacity:${opTr}; font-family:sans-serif; color:inherit; font-size: 0.9rem;" onclick="setLanguage('TR')">TR</span>
            <span style="color:inherit; opacity:0.5;">|</span>
            <span style="cursor:pointer; font-weight:${fwEn}; opacity:${opEn}; font-family:sans-serif; color:inherit; font-size: 0.9rem;" onclick="setLanguage('EN')">EN</span>
        `;
        tb.prepend(switcher);
    });
});
