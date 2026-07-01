$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        Swal.fire({ icon:'error', title:'Admin Only', text:'Unauthorized access',
            showConfirmButton:false, timer:1500, timerProgressBar:true, position:'center'
        }).then(() => { window.location.href = '../profile.html'; });
        return;
    }

    document.body.dataset.page = 'admin-dash';
    loadNav();
    loadFooter();

    const API = 'http://localhost:5000/api/v1/';
    const getToken = () => {
        const t = sessionStorage.getItem('token');
        if (!t) { window.location.href = '../login.html'; return null; }
        return JSON.parse(t);
    };
    const auth = () => ({ "Authorization": "Bearer " + getToken() });

    const php   = n  => '₱' + Math.abs(Math.round(n)).toLocaleString();
    const phpSigned = n => (n < 0 ? '−₱' : '₱') + Math.abs(Math.round(n)).toLocaleString();

    // ── Stats ─────────────────────────────────────────────────────
    $.ajax({
        method:"GET", url:`${API}dashboard-stats`, dataType:"json", headers:auth(),
        success(d) {
            const rev   = d.revenue         || 0;
            const cogs  = d.cogs            || 0;
            const spent = d.totalRestockSpent || 0;
            const inv   = d.inventoryValue  || 0;
            const gross = rev - cogs;
            const net   = rev - spent;          // TRUE bottom line: earned vs total invested

            // ── Hero ──
            $('#heroNetProfit')
                .text(phpSigned(net))
                .css('color', net >= 0 ? '#10B981' : '#F87171');

            if (net < 0) {
                $('#heroNetSub').text(
                    `You're ₱${Math.abs(Math.round(net)).toLocaleString()} in the negative — ` +
                    `₱${Math.round(spent).toLocaleString()} invested, ₱${Math.round(rev).toLocaleString()} earned so far.`
                );
            } else {
                $('#heroNetSub').text(
                    `In profit — ₱${Math.round(rev).toLocaleString()} earned, ` +
                    `₱${Math.round(spent).toLocaleString()} invested.`
                );
            }

            // Recovery bar (what % of capital has been earned back)
            const pct = spent > 0 ? Math.min(100, (rev / spent) * 100) : 100;
            $('#recoveryBar')
                .css('width', pct + '%')
                .css('background', net >= 0
                    ? 'linear-gradient(90deg,#10B981,#38BDF8)'
                    : 'linear-gradient(90deg,#F87171,#FBBF24)');
            $('#recoveryCaption').text(
                spent > 0
                    ? `${pct.toFixed(1)}% of capital recovered through sales`
                    : 'No restock data yet'
            );

            // ── Stat cards ──
            $('#statRevenue').text(php(rev));
            $('#statOrderCount').text(d.orders + ' paid orders');
            $('#statGrossProfit').text(phpSigned(gross)).css('color', gross >= 0 ? '#10B981' : '#F87171');
            $('#statInventory').text(php(inv));
            $('#statCustomers').text(d.customers || 0);
            $('#statOutOfStock').text(d.outOfStock || 0);
            $('#statLowStock').text(d.lowStock || 0);

            // ── Financial breakdown ──
            $('#finRevenue').text(php(rev));
            $('#finOrders').text(d.orders + ' orders');
            $('#finCOGS').text(php(cogs));
            $('#finGrossProfit').text(phpSigned(gross)).css('color', gross >= 0 ? '#10B981' : '#F87171');
            $('#finInventory').text(php(inv));
            $('#finNetProfit').text(phpSigned(net)).css('color', net >= 0 ? '#10B981' : '#F87171');

            // ── Alert pulses ──
            // ── Stock Alerts (merged) ──
            const totalAlerts = (d.outOfStock || 0) + (d.lowStock || 0);
            $('#statStockAlerts').text(totalAlerts);
            const breakdownParts = [];
            if (d.outOfStock > 0) breakdownParts.push(`${d.outOfStock} out of stock`);
            if (d.lowStock   > 0) breakdownParts.push(`${d.lowStock} low stock`);
            $('#statStockBreakdown').text(breakdownParts.length ? breakdownParts.join(' · ') : 'All items stocked');
            if (totalAlerts > 0) {
                $('#stockAlertCard').css({ 'border-color': 'rgba(239,68,68,0.6)', 'animation': 'outOfStockPulse 2s ease-in-out infinite' });
            }
        },
        error(e) { console.error('Stats error:', e); }
    });

    // ── Monthly Revenue vs COGS ───────────────────────────────────
    $.ajax({
        method:"GET", url:`${API}sales-chart`, dataType:"json", headers:auth(),
        success(data) {
            const rows = data.rows || [];
            const ctx = document.getElementById('monthlySalesChart');
            if (!ctx || !rows.length) return;
            new Chart(ctx, {
                type:'bar',
                data:{
                    labels: rows.map(r => r.month),
                    datasets:[
                        {
                            label:'Revenue (₱)',
                            data: rows.map(r => parseFloat(r.revenue || 0)),
                            backgroundColor:'rgba(251,191,36,0.55)', borderColor:'#FBBF24',
                            borderWidth:2, borderRadius:6
                        },
                        {
                            label:'COGS (₱)',
                            data: rows.map(r => parseFloat(r.expenses || 0)),
                            backgroundColor:'rgba(248,113,113,0.4)', borderColor:'#F87171',
                            borderWidth:2, borderRadius:6
                        },
                        {
                            label:'Gross Profit (₱)',
                            data: rows.map(r => parseFloat(r.revenue||0) - parseFloat(r.expenses||0)),
                            type:'line', borderColor:'#10B981',
                            backgroundColor:'rgba(16,185,129,0.06)',
                            borderWidth:2, pointBackgroundColor:'#10B981',
                            tension:0.4, fill:false
                        }
                    ]
                },
                options:{
                    responsive:true, maintainAspectRatio:false,
                    interaction:{mode:'index', intersect:false},
                    plugins:{
                        legend:{labels:{color:'#94A3B8', font:{size:11}}},
                        tooltip:{callbacks:{label: c => ` ${c.dataset.label}: ₱${Math.round(c.raw).toLocaleString()}`}}
                    },
                    scales:{
                        x:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#94A3B8'}},
                        y:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#94A3B8',
                            callback: v => '₱'+(v>=1000?(v/1000).toFixed(0)+'k':v)}}
                    }
                }
            });
        },
        error(e){ console.error('Sales chart:', e); }
    });

    // ── Category Doughnut ─────────────────────────────────────────
    $.ajax({
        method:"GET", url:`${API}items-chart`, dataType:"json", headers:auth(),
        success(data) {
            const rows = data.rows || data;
            const ctx = document.getElementById('itemsSoldChart');
            if (!ctx) return;
            new Chart(ctx, {
                type:'doughnut',
                data:{
                    labels: rows.map(r=>r.items),
                    datasets:[{
                        data: rows.map(r=>parseInt(r.total)),
                        backgroundColor:['#FBBF24','#FB7185','#38BDF8','#A78BFA','#64748B','#F43F5E','#10B981'],
                        borderColor:'#0F172A', borderWidth:2
                    }]
                },
                options:{
                    responsive:true, maintainAspectRatio:false,
                    plugins:{legend:{position:'right', labels:{color:'#E2E8F0', font:{size:11}}}}
                }
            });
        },
        error(e){ console.error('Category chart:', e); }
    });

    // ── Address Bar Chart ────────────────────────────────────────
    $.ajax({
        method:"GET", url:`${API}address-chart`, dataType:"json", headers:auth(),
        success(data) {
            const rows = data.rows || [];
            const ctx = document.getElementById('addressDistributionChart');
            if (!ctx) return;
            new Chart(ctx, {
                type:'bar',
                data:{
                    labels: rows.map(r=>r.addressline||'Unknown'),
                    datasets:[{
                        label:'Customers',
                        data: rows.map(r=>parseInt(r.total)),
                        backgroundColor:'rgba(245,158,11,0.65)', borderColor:'#FBBF24',
                        borderWidth:1, borderRadius:4, barThickness:14
                    }]
                },
                options:{
                    indexAxis:'y', responsive:true, maintainAspectRatio:false,
                    plugins:{legend:{display:false}},
                    scales:{
                        x:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#94A3B8'}},
                        y:{grid:{display:false}, ticks:{color:'#E2E8F0'}}
                    }
                }
            });
        },
        error(e){ console.error('Address chart:', e); }
    });

    // ── Restock Logs Feed ────────────────────────────────────────
    $.ajax({
        method:"GET", url:`${API}stock-activity`, dataType:"json", headers:auth(),
        success(logs) {
            const feed = $('#activityFeed');
            if (!logs || !logs.length) {
                feed.html('<div style="padding:2rem;text-align:center;color:#475569">No restock logs yet.</div>');
                return;
            }
            const html = logs.map(log => {
                const costPerUnit = Number(log.cost_price || 0);
                const totalCost   = Number(log.total_cost || 0);
                return `<div class="ev-item">
                    <div class="ev-dot dot-restock"><i class="fas fa-boxes"></i></div>
                    <div class="ev-body">
                        <div class="ev-name"><b>${log.item_name}</b></div>
                        <div class="ev-meta">
                            ₱${costPerUnit.toLocaleString()} / unit &nbsp;·&nbsp;
                            Total: ₱${totalCost.toLocaleString()} &nbsp;·&nbsp;
                            ${log.supplier_name} &nbsp;·&nbsp;
                            ${timeAgo(log.event_time)}
                        </div>
                    </div>
                    <span class="ev-qty qty-restock">+${log.quantity} units</span>
                </div>`;
            }).join('');
            feed.html(html);
        },
        error(e) {
            console.error('Restock logs error:', e);
            $('#activityFeed').html('<div style="padding:2rem;text-align:center;color:#F87171">Failed to load restock logs.</div>');
        }
    });

    function timeAgo(raw) {
        const d = new Date(raw);
        if (isNaN(d)) return '—';
        const s = Math.floor((Date.now() - d) / 1000);
        if (s < 60)     return s + 's ago';
        if (s < 3600)   return Math.floor(s/60) + 'm ago';
        if (s < 86400)  return Math.floor(s/3600) + 'h ago';
        if (s < 604800) return Math.floor(s/86400) + 'd ago';
        return d.toLocaleDateString();
    }
});
