/* ========================================
   BREW & BEAN — ADMİN PANELİ JS
   Dashboard, sipariş takibi, günsonu, raporlar
   ======================================== */

const API_BASE = 'api';
let allOrders = [];
let lastPollTime = null;

// ==========================================
// TABS
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab${capitalize(btn.dataset.tab)}`).classList.add('active');

        if (btn.dataset.tab === 'reports') {
            fetchReports();
        }
    });
});

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==========================================
// SİPARİŞLERİ GETİR
// ==========================================
async function fetchAllOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders.php`);
        if (!res.ok) throw new Error('API hatası');
        allOrders = await res.json();
        renderDashboard();
    } catch (err) {
        console.error('Sipariş getirme hatası:', err);
    }
}

async function pollUpdates() {
    try {
        const since = lastPollTime || new Date(Date.now() - 30000).toISOString().slice(0, 19).replace('T', ' ');
        const res = await fetch(`${API_BASE}/poll.php?since=${encodeURIComponent(since)}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.count > 0) {
            await fetchAllOrders();
        }
        lastPollTime = data.server_time;
    } catch (err) {
        console.error('Polling hatası:', err);
    }
}

// ==========================================
// DASHBOARD RENDER
// ==========================================
function renderDashboard() {
    // İstatistikler
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((s, o) => s + parseFloat(o.subtotal), 0);
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pending = allOrders.filter(o => o.status !== 'teslim_edildi').length;

    document.getElementById('statOrders').textContent = totalOrders;
    document.getElementById('statRevenue').textContent = `₺${totalRevenue.toFixed(0)}`;
    document.getElementById('statAvg').textContent = `₺${avgOrder.toFixed(0)}`;
    document.getElementById('statPending').textContent = pending;

    // Tablo
    const tbody = document.getElementById('ordersBody');

    if (totalOrders === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><span>☕</span>Henüz sipariş yok</td></tr>`;
        return;
    }

    tbody.innerHTML = allOrders.map(order => {
        const items = (order.items || []).map(i => `${i.emoji} ${i.item_name} (${i.size_label}) x${i.qty}`).join(', ');
        const statusLabels = {
            alindi: '🔵 Alındı',
            hazirlaniyor: '🟡 Hazırlanıyor',
            hazir: '🟢 Hazır',
            teslim_edildi: '⚫ Teslim'
        };
        const badgeClass = `badge-${order.status}`;
        const paymentIcon = order.payment_method === 'kart' ? '💳' : '💵';
        const time = new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        return `
            <tr>
                <td><strong>#${escapeHtml(order.order_no)}</strong></td>
                <td><strong>Masa ${order.table_no}</strong></td>
                <td>${escapeHtml(order.customer_name)}</td>
                <td style="max-width:250px; font-size:.8rem; color:var(--clr-text-muted)">${escapeHtml(items)}</td>
                <td><span class="payment-badge">${paymentIcon} ${order.payment_method === 'kart' ? 'Kart' : 'Nakit'}</span></td>
                <td><strong>₺${parseFloat(order.subtotal).toFixed(0)}</strong></td>
                <td><span class="status-badge ${badgeClass}">${statusLabels[order.status] || order.status}</span></td>
                <td>${time}</td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// GÜNSONU
// ==========================================
document.getElementById('endDayBtn').addEventListener('click', () => {
    // Önizleme göster
    const total = allOrders.length;
    const revenue = allOrders.reduce((s, o) => s + parseFloat(o.subtotal), 0);
    const cardRev = allOrders.filter(o => o.payment_method === 'kart').reduce((s, o) => s + parseFloat(o.subtotal), 0);
    const cashRev = revenue - cardRev;

    document.getElementById('endDayPreview').innerHTML = `
        <div class="eod-summary">
            <div class="eod-stat">
                <div class="eod-stat-value">${total}</div>
                <div class="eod-stat-label">Toplam Sipariş</div>
            </div>
            <div class="eod-stat">
                <div class="eod-stat-value">₺${revenue.toFixed(0)}</div>
                <div class="eod-stat-label">Toplam Gelir</div>
            </div>
            <div class="eod-stat">
                <div class="eod-stat-value">₺${cardRev.toFixed(0)}</div>
                <div class="eod-stat-label">💳 Kart</div>
            </div>
            <div class="eod-stat">
                <div class="eod-stat-value">₺${cashRev.toFixed(0)}</div>
                <div class="eod-stat-label">💵 Nakit</div>
            </div>
        </div>
    `;

    document.getElementById('endDayModal').classList.add('open');
});

document.getElementById('endDayCancel').addEventListener('click', () => {
    document.getElementById('endDayModal').classList.remove('open');
});

document.getElementById('endDayConfirm').addEventListener('click', async () => {
    document.getElementById('endDayConfirm').disabled = true;
    document.getElementById('endDayConfirm').textContent = '⏳ İşleniyor...';

    try {
        const res = await fetch(`${API_BASE}/end-of-day.php`, { method: 'POST' });
        const data = await res.json();

        document.getElementById('endDayModal').classList.remove('open');
        document.getElementById('endDayConfirm').disabled = false;
        document.getElementById('endDayConfirm').textContent = '🌙 Günsonu Onayla';

        if (data.success) {
            const report = data.report;
            const topItems = report.top_items || {};

            document.getElementById('endDayResult').innerHTML = `
                <div class="eod-summary">
                    <div class="eod-stat">
                        <div class="eod-stat-value">${report.total_orders}</div>
                        <div class="eod-stat-label">Toplam Sipariş</div>
                    </div>
                    <div class="eod-stat">
                        <div class="eod-stat-value">₺${parseFloat(report.total_revenue).toFixed(0)}</div>
                        <div class="eod-stat-label">Toplam Gelir</div>
                    </div>
                    <div class="eod-stat">
                        <div class="eod-stat-value">₺${parseFloat(report.card_revenue).toFixed(0)}</div>
                        <div class="eod-stat-label">💳 Kart Geliri</div>
                    </div>
                    <div class="eod-stat">
                        <div class="eod-stat-value">₺${parseFloat(report.cash_revenue).toFixed(0)}</div>
                        <div class="eod-stat-label">💵 Nakit Geliri</div>
                    </div>
                </div>
                <div class="eod-top-items">
                    <h4>🏆 En Çok Satılanlar</h4>
                    ${Object.entries(topItems).map(([name, qty]) =>
                        `<div class="eod-top-item"><span>${escapeHtml(name)}</span><strong>${qty} adet</strong></div>`
                    ).join('')}
                </div>
            `;

            document.getElementById('endDayResultModal').classList.add('open');

            // Tabloyu sıfırla
            allOrders = [];
            renderDashboard();
        } else {
            alert(data.error || 'Günsonu işlemi başarısız');
        }
    } catch (err) {
        console.error('Günsonu hatası:', err);
        alert('Günsonu işlemi sırasında bir hata oluştu.');
        document.getElementById('endDayModal').classList.remove('open');
        document.getElementById('endDayConfirm').disabled = false;
        document.getElementById('endDayConfirm').textContent = '🌙 Günsonu Onayla';
    }
});

// ==========================================
// GEÇMİŞ RAPORLAR
// ==========================================
async function fetchReports() {
    try {
        const res = await fetch(`${API_BASE}/reports.php`);
        if (!res.ok) throw new Error('Rapor getirme hatası');
        const reports = await res.json();
        renderReports(reports);
    } catch (err) {
        console.error('Rapor getirme hatası:', err);
    }
}

function renderReports(reports) {
    const container = document.getElementById('reportsList');

    if (reports.length === 0) {
        container.innerHTML = `<div class="reports-empty"><span>📊</span>Henüz günsonu raporu yok</div>`;
        return;
    }

    container.innerHTML = reports.map(r => {
        const dateStr = new Date(r.report_date + 'T00:00:00').toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="report-card" onclick="showReportDetail(${r.id})">
                <div class="report-date">📅 ${dateStr}</div>
                <div></div>
                <div class="report-stat">
                    <div class="report-stat-value">${r.total_orders}</div>
                    <div class="report-stat-label">Sipariş</div>
                </div>
                <div class="report-stat">
                    <div class="report-stat-value">₺${parseFloat(r.total_revenue).toFixed(0)}</div>
                    <div class="report-stat-label">Gelir</div>
                </div>
                <div class="report-arrow">→</div>
            </div>
        `;
    }).join('');
}

async function showReportDetail(reportId) {
    try {
        const res = await fetch(`${API_BASE}/reports.php?id=${reportId}`);
        if (!res.ok) throw new Error('Rapor detay hatası');
        const report = await res.json();

        const dateStr = new Date(report.report_date + 'T00:00:00').toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        document.getElementById('reportDetailTitle').textContent = `📅 ${dateStr} Raporu`;

        const ordersData = report.orders_data || {};
        const orders = ordersData.orders || [];
        const topItems = ordersData.top_items || {};

        document.getElementById('reportDetailContent').innerHTML = `
            <div class="eod-summary">
                <div class="eod-stat">
                    <div class="eod-stat-value">${report.total_orders}</div>
                    <div class="eod-stat-label">Toplam Sipariş</div>
                </div>
                <div class="eod-stat">
                    <div class="eod-stat-value">₺${parseFloat(report.total_revenue).toFixed(0)}</div>
                    <div class="eod-stat-label">Toplam Gelir</div>
                </div>
                <div class="eod-stat">
                    <div class="eod-stat-value">₺${parseFloat(report.card_revenue).toFixed(0)}</div>
                    <div class="eod-stat-label">💳 Kart</div>
                </div>
                <div class="eod-stat">
                    <div class="eod-stat-value">₺${parseFloat(report.cash_revenue).toFixed(0)}</div>
                    <div class="eod-stat-label">💵 Nakit</div>
                </div>
            </div>

            <div class="eod-top-items" style="margin-top:20px;">
                <h4>🏆 En Çok Satılanlar</h4>
                ${Object.entries(topItems).map(([name, qty]) =>
                    `<div class="eod-top-item"><span>${escapeHtml(name)}</span><strong>${qty} adet</strong></div>`
                ).join('')}
            </div>

            ${orders.length > 0 ? `
                <h4 style="margin-top:20px; font-size:.9rem;">📋 Tüm Siparişler (${orders.length})</h4>
                <table class="report-detail-table">
                    <thead>
                        <tr>
                            <th>Sipariş No</th>
                            <th>Müşteri</th>
                            <th>Masa</th>
                            <th>Ödeme</th>
                            <th>Tutar</th>
                            <th>Saat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(o => {
                            const time = new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            return `
                                <tr>
                                    <td>#${escapeHtml(o.order_no)}</td>
                                    <td>${escapeHtml(o.customer_name)}</td>
                                    <td>Masa ${o.table_no}</td>
                                    <td>${o.payment_method === 'kart' ? '💳' : '💵'}</td>
                                    <td><strong>₺${parseFloat(o.subtotal).toFixed(0)}</strong></td>
                                    <td>${time}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            ` : ''}
        `;

        document.getElementById('reportDetailModal').classList.add('open');
    } catch (err) {
        console.error('Rapor detay hatası:', err);
        alert('Rapor detayı yüklenemedi.');
    }
}

// ==========================================
// YARDIMCI
// ==========================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function updateClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ==========================================
// INIT
// ==========================================
fetchAllOrders();
setInterval(pollUpdates, 3000);
setInterval(updateClock, 1000);
updateClock();
