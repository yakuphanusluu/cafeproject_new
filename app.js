/* ========================================
   BREW & BEAN — APP.JS (v2)
   QR ile sipariş, API entegrasyonu, durum takibi
   ======================================== */

const API_BASE = 'api';

// ==========================================
// MENÜ VERİLERİ
// ==========================================
const menuItems = [
    // Sıcak Kahveler
    { id:1, name:"Türk Kahvesi", desc:"Geleneksel yöntemlerle pişirilen otantik Türk kahvesi", category:"sicak-kahve", categoryLabel:"Sıcak Kahve", emoji:"☕", gradient:"linear-gradient(135deg, #3e2723 0%, #5d4037 100%)", sizes:[{label:"Tek",price:45},{label:"Çift",price:65}] },
    { id:2, name:"Espresso", desc:"Yoğun ve güçlü tek atımlık İtalyan klasiği", category:"sicak-kahve", categoryLabel:"Sıcak Kahve", emoji:"⚡", gradient:"linear-gradient(135deg, #1b0000 0%, #4e342e 100%)", sizes:[{label:"Single",price:40},{label:"Double",price:55},{label:"Triple",price:70}] },
    { id:3, name:"Cappuccino", desc:"Kremsi süt köpüğü ile dengelenmiş espresso", category:"sicak-kahve", categoryLabel:"Sıcak Kahve", emoji:"🤎", gradient:"linear-gradient(135deg, #4e342e 0%, #8d6e63 100%)", sizes:[{label:"S",price:55},{label:"M",price:65},{label:"L",price:75}] },
    { id:4, name:"Latte", desc:"Yumuşak süt ile buluşan hafif kahve lezzeti", category:"sicak-kahve", categoryLabel:"Sıcak Kahve", emoji:"🥛", gradient:"linear-gradient(135deg, #6d4c41 0%, #a1887f 100%)", sizes:[{label:"S",price:55},{label:"M",price:65},{label:"L",price:75}] },
    { id:5, name:"Americano", desc:"Sıcak su ile uzatılmış espresso — sade ve temiz", category:"sicak-kahve", categoryLabel:"Sıcak Kahve", emoji:"🇺🇸", gradient:"linear-gradient(135deg, #212121 0%, #616161 100%)", sizes:[{label:"S",price:45},{label:"M",price:55},{label:"L",price:65}] },
    { id:6, name:"Flat White", desc:"Avustralya usulü, kadifemsi mikro köpüklü kahve", category:"sicak-kahve", categoryLabel:"Sıcak Kahve", emoji:"🍵", gradient:"linear-gradient(135deg, #5d4037 0%, #bcaaa4 100%)", sizes:[{label:"S",price:60},{label:"M",price:70}] },
    // Soğuk Kahveler
    { id:7, name:"Iced Latte", desc:"Buz gibi soğuk süt ve espresso birleşimi", category:"soguk-kahve", categoryLabel:"Soğuk Kahve", emoji:"🧊", gradient:"linear-gradient(135deg, #81d4fa 0%, #b3e5fc 100%)", sizes:[{label:"M",price:65},{label:"L",price:75}] },
    { id:8, name:"Cold Brew", desc:"18 saat soğuk demleme yöntemiyle hazırlanan özel kahve", category:"soguk-kahve", categoryLabel:"Soğuk Kahve", emoji:"💧", gradient:"linear-gradient(135deg, #0d47a1 0%, #42a5f5 100%)", sizes:[{label:"M",price:70},{label:"L",price:85}] },
    { id:9, name:"Frappuccino", desc:"Buzlu karışık kahve, krema ve çikolata soslu", category:"soguk-kahve", categoryLabel:"Soğuk Kahve", emoji:"🥤", gradient:"linear-gradient(135deg, #4e342e 0%, #a1887f 100%)", sizes:[{label:"M",price:75},{label:"L",price:90}] },
    { id:10, name:"Iced Americano", desc:"Sade ve ferahlatıcı buzlu americano", category:"soguk-kahve", categoryLabel:"Soğuk Kahve", emoji:"❄️", gradient:"linear-gradient(135deg, #37474f 0%, #78909c 100%)", sizes:[{label:"M",price:55},{label:"L",price:65}] },
    // Özel Kahveler
    { id:11, name:"Caramel Macchiato", desc:"Karamel sos, vanilya şurubu ve sütlü espresso", category:"ozel-kahve", categoryLabel:"Özel Kahve", emoji:"🍯", gradient:"linear-gradient(135deg, #f57f17 0%, #ffb74d 100%)", sizes:[{label:"M",price:80},{label:"L",price:95}] },
    { id:12, name:"Mocha", desc:"Çikolata ve espressonun muhteşem uyumu", category:"ozel-kahve", categoryLabel:"Özel Kahve", emoji:"🍫", gradient:"linear-gradient(135deg, #3e2723 0%, #795548 100%)", sizes:[{label:"M",price:75},{label:"L",price:90}] },
    { id:13, name:"Lavanta Latte", desc:"Lavanta çiçeği özütü ile aromatik latte", category:"ozel-kahve", categoryLabel:"Özel Kahve", emoji:"💜", gradient:"linear-gradient(135deg, #7b1fa2 0%, #ce93d8 100%)", sizes:[{label:"M",price:85},{label:"L",price:100}] },
    { id:14, name:"Matcha Latte", desc:"Japon usulü yeşil çay tozu ile hazırlanan latte", category:"ozel-kahve", categoryLabel:"Özel Kahve", emoji:"🍵", gradient:"linear-gradient(135deg, #2e7d32 0%, #81c784 100%)", sizes:[{label:"M",price:80},{label:"L",price:95}] },
    { id:15, name:"Affogato", desc:"Sıcak espresso üzerine vanilyalı dondurma", category:"ozel-kahve", categoryLabel:"Özel Kahve", emoji:"🍨", gradient:"linear-gradient(135deg, #4e342e 0%, #d7ccc8 100%)", sizes:[{label:"Tek",price:75},{label:"Çift",price:110}] },
    // Tatlılar
    { id:16, name:"Tiramisu", desc:"İtalyan usulü mascarpone kremalı kahveli tatlı", category:"tatli", categoryLabel:"Tatlı", emoji:"🍰", gradient:"linear-gradient(135deg, #d7ccc8 0%, #efebe9 100%)", sizes:[{label:"Dilim",price:90}] },
    { id:17, name:"Cheesecake", desc:"New York usulü kremalı cheesecake", category:"tatli", categoryLabel:"Tatlı", emoji:"🧁", gradient:"linear-gradient(135deg, #fff9c4 0%, #fffde7 100%)", sizes:[{label:"Dilim",price:85}] },
    { id:18, name:"Brownie", desc:"Yoğun çikolatalı, fındıklı sıcak brownie", category:"tatli", categoryLabel:"Tatlı", emoji:"🍫", gradient:"linear-gradient(135deg, #3e2723 0%, #6d4c41 100%)", sizes:[{label:"Tek",price:65},{label:"A la Mode",price:85}] },
    // Atıştırmalık
    { id:19, name:"Croissant", desc:"Tereyağlı, kat kat açılmış Fransız kruvasanı", category:"atistirmalik", categoryLabel:"Atıştırmalık", emoji:"🥐", gradient:"linear-gradient(135deg, #f9a825 0%, #fdd835 100%)", sizes:[{label:"Sade",price:45},{label:"Çikolatalı",price:55}] },
    { id:20, name:"Sandviç", desc:"Taze sebzeler ve peynirli ev yapımı sandviç", category:"atistirmalik", categoryLabel:"Atıştırmalık", emoji:"🥪", gradient:"linear-gradient(135deg, #8bc34a 0%, #c5e1a5 100%)", sizes:[{label:"Normal",price:70},{label:"Büyük",price:90}] },
    { id:21, name:"Cookie", desc:"Damla çikolatalı yumuşak kurabiye", category:"atistirmalik", categoryLabel:"Atıştırmalık", emoji:"🍪", gradient:"linear-gradient(135deg, #d7a86e 0%, #f0d9b5 100%)", sizes:[{label:"Tek",price:30},{label:"3'lü",price:75}] }
];

// ==========================================
// GLOBAL STATE
// ==========================================
let cart = [];
let selectedSizes = {};
let tableNo = null;
let customerToken = null;
let activeOrderNo = null;
let trackingInterval = null;

// ==========================================
// DOM ELEMENTS
// ==========================================
const menuGrid = document.getElementById('menuGrid');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartOverlay = document.getElementById('cartOverlay');
const cartPanel = document.getElementById('cartPanel');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartFooter = document.getElementById('cartFooter');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutDialog = document.getElementById('checkoutDialog');
const dialogClose = document.getElementById('dialogClose');
const toastContainer = document.getElementById('toastContainer');
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.querySelector('.nav-links');

// ==========================================
// MASA NUMARASI YÖNETİMİ
// ==========================================
function initTableNo() {
    const params = new URLSearchParams(window.location.search);
    const masaParam = params.get('masa');

    if (masaParam && parseInt(masaParam) > 0) {
        tableNo = parseInt(masaParam);
        showTableBadge();
    }
}

function showTableBadge() {
    if (tableNo) {
        document.getElementById('tableBadge').style.display = 'flex';
        document.getElementById('tableNoDisplay').textContent = tableNo;
    }
}

function ensureTableNo() {
    return new Promise((resolve) => {
        if (tableNo) {
            resolve(tableNo);
            return;
        }

        const dialog = document.getElementById('tableDialog');
        const input = document.getElementById('manualTableNo');
        const btn = document.getElementById('setTableBtn');

        dialog.showModal();

        const handler = () => {
            const val = parseInt(input.value);
            if (val > 0) {
                tableNo = val;
                showTableBadge();
                dialog.close();
                btn.removeEventListener('click', handler);
                resolve(tableNo);
            } else {
                input.style.borderColor = '#d44b4b';
                input.focus();
            }
        };

        btn.addEventListener('click', handler);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handler(); }
        });
    });
}

// ==========================================
// MENÜ RENDER
// ==========================================
function renderMenu(category = 'all') {
    const items = category === 'all' ? menuItems : menuItems.filter(item => item.category === category);

    menuGrid.innerHTML = items.map((item, idx) => {
        const sizeIdx = selectedSizes[item.id] ?? 0;
        const currentSize = item.sizes[sizeIdx];

        return `
            <div class="menu-card" style="animation-delay: ${idx * .06}s" data-category="${item.category}">
                <div class="menu-card-img" style="background: ${item.gradient}">
                    <span>${item.emoji}</span>
                </div>
                <div class="menu-card-body">
                    <p class="menu-card-category">${item.categoryLabel}</p>
                    <h3 class="menu-card-name">${item.name}</h3>
                    <p class="menu-card-desc">${item.desc}</p>
                    ${item.sizes.length > 1 ? `
                        <div class="size-picker">
                            ${item.sizes.map((s, i) => `
                                <button class="size-btn ${i === sizeIdx ? 'active' : ''}"
                                    onclick="selectSize(${item.id}, ${i})">${s.label}</button>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="menu-card-footer">
                        <span class="menu-card-price">₺${currentSize.price}</span>
                        <button class="add-to-cart" onclick="addToCart(${item.id})" aria-label="${item.name} sepete ekle">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    observeCards();
}

function selectSize(itemId, sizeIndex) {
    selectedSizes[itemId] = sizeIndex;
    const activeCategory = document.querySelector('.filter-btn.active')?.dataset.category || 'all';
    renderMenu(activeCategory);
}

// Filtreler
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMenu(btn.dataset.category);
    });
});

// ==========================================
// SEPET İŞLEMLERİ
// ==========================================
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    const sizeIdx = selectedSizes[itemId] ?? 0;
    const size = item.sizes[sizeIdx];
    const cartKey = `${itemId}-${sizeIdx}`;

    const existing = cart.find(c => c.key === cartKey);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({
            key: cartKey,
            itemId: item.id,
            name: item.name,
            emoji: item.emoji,
            gradient: item.gradient,
            sizeLabel: size.label,
            price: size.price,
            qty: 1
        });
    }

    updateCartUI();
    showToast(`${item.name} (${size.label}) sepete eklendi!`, 'success');

    // Buton animasyonu
    const btn = event.currentTarget;
    btn.classList.add('added');
    btn.textContent = '✓';
    setTimeout(() => { btn.classList.remove('added'); btn.textContent = '+'; }, 800);
}

function removeFromCart(cartKey) {
    cart = cart.filter(c => c.key !== cartKey);
    updateCartUI();
}

function updateQty(cartKey, delta) {
    const item = cart.find(c => c.key === cartKey);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { removeFromCart(cartKey); return; }
    updateCartUI();
}

function getCartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function getCartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function updateCartUI() {
    const count = getCartCount();
    const total = getCartTotal();

    cartCount.textContent = count;
    cartCount.classList.toggle('show', count > 0);

    if (count === 0) {
        cartEmpty.style.display = 'block';
        cartFooter.style.display = 'none';
        cartItems.innerHTML = '';
        cartItems.appendChild(cartEmpty);
    } else {
        cartEmpty.style.display = 'none';
        cartFooter.style.display = 'block';

        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-img" style="background: ${item.gradient}">${item.emoji}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-size">${item.sizeLabel}</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateQty('${item.key}', -1)">−</button>
                        <span class="cart-item-qty">${item.qty}</span>
                        <button class="qty-btn" onclick="updateQty('${item.key}', 1)">+</button>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart('${item.key}')">Kaldır</button>
                </div>
                <div class="cart-item-price">₺${item.price * item.qty}</div>
            </div>
        `).join('');

        cartTotal.textContent = `₺${total}`;
    }
}

// Sepet Panel Aç/Kapat
function openCart() { cartPanel.classList.add('open'); cartOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { cartPanel.classList.remove('open'); cartOverlay.classList.remove('open'); document.body.style.overflow = ''; }

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// ==========================================
// CHECKOUT (SİPARİŞ) MODAL
// ==========================================
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

function showStep(n) {
    [step1, step2, step3].forEach(s => s.classList.add('hidden'));
    document.getElementById(`step${n}`).classList.remove('hidden');
}

// Sipariş Ver → Masa kontrolü → Checkout
checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;
    await ensureTableNo();
    closeCart();
    renderOrderSummary();
    showStep(1);
    checkoutDialog.showModal();
});

dialogClose.addEventListener('click', () => checkoutDialog.close());
checkoutDialog.addEventListener('click', (e) => { if (e.target === checkoutDialog) checkoutDialog.close(); });

// Step 1 — Sipariş özeti
function renderOrderSummary() {
    const summary = document.getElementById('orderSummary');
    const total = getCartTotal();

    summary.innerHTML = cart.map(item => `
        <div class="order-item">
            <div class="order-item-left">
                <span class="order-item-emoji">${item.emoji}</span>
                <div class="order-item-details">
                    <span>${item.name} x${item.qty}</span>
                    <small>${item.sizeLabel}</small>
                </div>
            </div>
            <strong>₺${item.price * item.qty}</strong>
        </div>
    `).join('');

    document.getElementById('orderTotal').textContent = `₺${total}`;
}

// Step 1 → 2
document.getElementById('toStep2').addEventListener('click', () => {
    document.getElementById('finalTotal').textContent = `₺${getCartTotal()}`;
    showStep(2);
});

document.getElementById('backToStep1').addEventListener('click', () => showStep(1));

// Step 2 — Sipariş Gönder (API)
document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('placeOrderBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Gönderiliyor...';

    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const note = document.getElementById('note').value.trim();
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    const orderData = {
        customer_name: fullName,
        phone: phone,
        table_no: tableNo,
        payment_method: paymentMethod,
        note: note,
        items: cart.map(item => ({
            name: item.name,
            emoji: item.emoji,
            size_label: item.sizeLabel,
            price: item.price,
            qty: item.qty
        }))
    };

    try {
        const res = await fetch(`${API_BASE}/orders.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const data = await res.json();

        if (data.success) {
            activeOrderNo = data.order_no;
            customerToken = data.customer_token;

            document.getElementById('orderNo').textContent = data.order_no;

            const paymentLabel = paymentMethod === 'kart' ? '💳 Kart' : '💵 Nakit';
            document.getElementById('successDetails').innerHTML = `
                <p><strong>Masa:</strong> ${tableNo}</p>
                <p><strong>Müşteri:</strong> ${fullName}</p>
                <p><strong>Ödeme:</strong> ${paymentLabel}</p>
                <p><strong>Toplam:</strong> ₺${getCartTotal()}</p>
            `;

            showStep(3);
            startOrderTracking();

            // Bildirim izni iste
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }

            // Sepeti temizle
            cart = [];
            updateCartUI();
        } else {
            showToast(data.error || 'Sipariş gönderilemedi', 'info');
        }
    } catch (err) {
        console.error('Sipariş gönderme hatası:', err);
        showToast('Bağlantı hatası. Lütfen tekrar deneyin.', 'info');
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="btn-icon">🔒</span> Siparişi Onayla';
});

// Başarılı ekranı kapat
document.getElementById('closeSuccess').addEventListener('click', () => {
    checkoutDialog.close();
    showToast('Siparişiniz için teşekkürler! ☕', 'success');
});

// ==========================================
// SİPARİŞ TAKİBİ (Polling)
// ==========================================
function startOrderTracking() {
    if (trackingInterval) clearInterval(trackingInterval);

    trackingInterval = setInterval(async () => {
        if (!customerToken) { clearInterval(trackingInterval); return; }

        try {
            const res = await fetch(`${API_BASE}/orders.php?customer_token=${customerToken}`);
            if (!res.ok) return;
            const order = await res.json();

            updateTracker(order.status);

            // "Hazır" bildirimini gönder
            if (order.status === 'hazir') {
                sendBrowserNotification('☕ Siparişiniz Hazır!', `Sipariş #${order.order_no} — Masa ${order.table_no} hazır, afiyet olsun!`);
                showToast('☕ Siparişiniz hazır! Afiyet olsun!', 'success');
            }

            // "Teslim Edildi" → tracking durdur
            if (order.status === 'teslim_edildi') {
                clearInterval(trackingInterval);
                trackingInterval = null;
                customerToken = null;
            }
        } catch (err) {
            console.error('Takip hatası:', err);
        }
    }, 3000);
}

function updateTracker(status) {
    const statuses = ['alindi', 'hazirlaniyor', 'hazir', 'teslim_edildi'];
    const currentIdx = statuses.indexOf(status);

    document.querySelectorAll('.tracker-step').forEach((step, i) => {
        step.classList.toggle('active', i <= currentIdx);
        step.classList.toggle('current', i === currentIdx);
    });

    document.querySelectorAll('.tracker-line').forEach((line, i) => {
        line.classList.toggle('active', i < currentIdx);
    });
}

function sendBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '☕' });
    }
}

// ==========================================
// TOAST BİLDİRİM
// ==========================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : 'ℹ️'}</span> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==========================================
// NAVİGASYON
// ==========================================
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    mobileToggle.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        mobileToggle.classList.remove('active');
    });
});

// Active nav on scroll
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-links a[href="#${id}"]`);
        if (link) {
            link.classList.toggle('active', scrollY >= top && scrollY < top + height);
        }
    });
});

// İletişim formu
document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Mesajınız başarıyla gönderildi!', 'success');
    e.target.reset();
});

// ==========================================
// SCROLL ANİMASYON
// ==========================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

function observeCards() {
    document.querySelectorAll('.menu-card, .feature-card, .contact-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity .5s ease, transform .5s ease';
        observer.observe(card);
    });
}

// ==========================================
// INIT
// ==========================================
initTableNo();
renderMenu();
