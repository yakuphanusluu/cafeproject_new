/* ========================================
   BREW & BEAN — BARİSTA PANELİ JS
   Sipariş yönetimi, polling, bildirimler
   ======================================== */

const API_BASE = 'api';
let allOrders = [];
let lastPollTime = null;
let soundEnabled = true;
let knownOrderIds = new Set();

// ==========================================
// POLLING — Her 3 saniyede sunucuyu kontrol et
// ==========================================
async function fetchAllOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders.php`);
        if (!res.ok) throw new Error('API hatası');
        const orders = await res.json();

        // Yeni sipariş tespiti
        const newOrders = orders.filter(o => !knownOrderIds.has(o.id));
        if (newOrders.length > 0 && knownOrderIds.size > 0) {
            // İlk yükleme değilse bildirim göster
            playNotificationSound();
            showNotifBanner(newOrders.length);
        }

        // Bilinen ID'leri güncelle
        orders.forEach(o => knownOrderIds.add(o.id));

        allOrders = orders;
        renderKanban();
    } catch (err) {
        console.error('Sipariş getirme hatası:', err);
    }
}

async function pollUpdates() {
    try {
        const since = lastPollTime || new Date(Date.now() - 30000).toISOString().slice(0, 19).replace('T', ' ');
        const res = await fetch(`${API_BASE}/poll.php?since=${encodeURIComponent(since)}`);
        if (!res.ok) throw new Error('Poll hatası');
        const data = await res.json();

        if (data.count > 0) {
            // Yeni veya güncellenen sipariş var, tüm listeyi yenile
            await fetchAllOrders();
        }

        lastPollTime = data.server_time;
    } catch (err) {
        console.error('Polling hatası:', err);
    }
}

// ==========================================
// KANBAN RENDER
// ==========================================
function renderKanban() {
    const columns = {
        alindi: [],
        hazirlaniyor: [],
        hazir: [],
        teslim_edildi: []
    };

    allOrders.forEach(order => {
        if (columns[order.status]) {
            columns[order.status].push(order);
        }
    });

    renderColumn('colAlindi', columns.alindi, 'alindi');
    renderColumn('colHazirlaniyor', columns.hazirlaniyor, 'hazirlaniyor');
    renderColumn('colHazir', columns.hazir, 'hazir');
    renderColumn('colTeslim', columns.teslim_edildi, 'teslim_edildi');

    // Sayaçları güncelle
    document.getElementById('countAlindi').textContent = columns.alindi.length;
    document.getElementById('countHazirlaniyor').textContent = columns.hazirlaniyor.length;
    document.getElementById('countHazir').textContent = columns.hazir.length;
    document.getElementById('countTeslim').textContent = columns.teslim_edildi.length;

    const total = allOrders.length;
    document.getElementById('totalOrders').textContent = `${total} Sipariş`;
}

function renderColumn(containerId, orders, status) {
    const container = document.getElementById(containerId);

    if (orders.length === 0) {
        const emptyMessages = {
            alindi: '<span>📋</span>Yeni sipariş bekleniyor...',
            hazirlaniyor: '<span>⏳</span>Henüz hazırlanan sipariş yok',
            hazir: '<span>✅</span>Teslim bekleyen sipariş yok',
            teslim_edildi: '<span>🎉</span>Henüz teslim edilen sipariş yok'
        };
        container.innerHTML = `<div class="column-empty">${emptyMessages[status]}</div>`;
        return;
    }

    container.innerHTML = orders.map(order => renderOrderCard(order)).join('');
}

function renderOrderCard(order) {
    const items = order.items || [];
    const timeStr = formatTime(order.created_at);
    const elapsed = getElapsed(order.created_at);
    const paymentIcon = order.payment_method === 'kart' ? '💳' : '💵';
    const paymentLabel = order.payment_method === 'kart' ? 'Kart' : 'Nakit';

    let actionBtn = '';
    switch (order.status) {
        case 'alindi':
            actionBtn = `<button class="card-action btn-to-hazirlaniyor" onclick="updateStatus(${order.id}, 'hazirlaniyor')">👨‍🍳 Hazırlamaya Başla</button>`;
            break;
        case 'hazirlaniyor':
            actionBtn = `<button class="card-action btn-to-hazir" onclick="updateStatus(${order.id}, 'hazir')">✅ Hazır</button>`;
            break;
        case 'hazir':
            actionBtn = `<button class="card-action btn-to-teslim" onclick="updateStatus(${order.id}, 'teslim_edildi')">🤝 Teslim Edildi</button>`;
            break;
        case 'teslim_edildi':
            actionBtn = `<div class="card-done">✓ Teslim edildi — ${timeStr}</div>`;
            break;
    }

    const noteHTML = order.note ? `
        <div class="card-note">
            <span>📝</span>
            <span>${escapeHtml(order.note)}</span>
        </div>
    ` : '';

    return `
        <div class="order-card" data-id="${order.id}">
            <div class="card-top">
                <span class="card-order-no">#${order.order_no}</span>
                <span class="card-table">Masa ${order.table_no}</span>
            </div>
            <div class="card-customer">👤 ${escapeHtml(order.customer_name)}${order.phone ? ' • 📞 ' + escapeHtml(order.phone) : ''}</div>
            <div class="card-items">
                ${items.map(item => `
                    <div class="card-item">
                        <div class="card-item-left">
                            <span>${item.emoji}</span>
                            <span>${escapeHtml(item.item_name)}</span>
                            <span style="color:#999; font-size:.8rem">(${escapeHtml(item.size_label)})</span>
                        </div>
                        <span class="card-item-qty">x${item.qty}</span>
                    </div>
                `).join('')}
            </div>
            ${noteHTML}
            <div class="card-meta">
                <div class="card-payment">${paymentIcon} ${paymentLabel}</div>
                <span class="card-total">₺${parseFloat(order.subtotal).toFixed(0)}</span>
            </div>
            <div class="card-meta">
                <span>🕐 ${timeStr}</span>
                <span>${elapsed}</span>
            </div>
            ${actionBtn}
        </div>
    `;
}

// ==========================================
// DURUM GÜNCELLEME
// ==========================================
async function updateStatus(orderId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/status.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status: newStatus })
        });

        if (!res.ok) throw new Error('Durum güncelleme hatası');

        const data = await res.json();
        if (data.success) {
            // Lokal state güncelle
            const order = allOrders.find(o => o.id == orderId);
            if (order) {
                order.status = newStatus;
                renderKanban();
            }
        }
    } catch (err) {
        console.error('Durum güncelleme hatası:', err);
        alert('Durum güncellenemedi. Lütfen tekrar deneyin.');
    }
}

// ==========================================
// BİLDİRİM SESİ
// ==========================================
function playNotificationSound() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Ding sesi oluştur
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.setValueAtTime(830, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        // Ses çalınamazsa sessizce devam et
    }
}

function showNotifBanner(count) {
    const banner = document.getElementById('notifBanner');
    banner.textContent = `🔔 ${count} yeni sipariş geldi!`;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 3000);
}

// Ses toggle
document.getElementById('soundToggle').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggle').textContent = soundEnabled ? '🔔 Ses Açık' : '🔕 Ses Kapalı';
});

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================
function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function getElapsed(dateStr) {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000 / 60); // dakika
    if (diff < 1) return 'Az önce';
    if (diff < 60) return `${diff} dk önce`;
    return `${Math.floor(diff / 60)} sa ${diff % 60} dk`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Saat
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ==========================================
// INIT
// ==========================================
fetchAllOrders();
setInterval(pollUpdates, 3000);
setInterval(updateClock, 1000);
updateClock();
