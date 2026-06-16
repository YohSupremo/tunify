/* Dashboard page */
$(document).ready(function () {
  document.body.dataset.page = '';
  loadNav();
  loadFooter();

  function animateValue(sel, start, end, duration, fmt) {
    const $el = $(sel);
    if (!$el.length) return;
    const startTime = performance.now();
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const val = start + (end - start) * (1 - Math.pow(1 - p, 3));
      $el.text(fmt ? fmt(val) : Math.round(val).toLocaleString());
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderStats() {
    const s = TunifyDashboardStats;
    animateValue('#statRevenue', 0, s.revenue, 1200, v => '₱' + Math.round(v).toLocaleString());
    animateValue('#statOrders', 0, s.orders, 1000);
    animateValue('#statCustomers', 0, s.customers, 1000);
    $('#statLowStock').text(s.lowStock.length);
  }

  function renderCharts() {
    const $chart = $('#categoryChart');
    if ($chart.length) {
      $chart.empty();
      TunifyDashboardStats.salesByCategory.forEach((c, i) => {
        $chart.append(`
          <div class="bar-chart-row fade-in-up">
            <div class="bar-chart-label">${c.label}</div>
            <div class="bar-chart-track"><div class="bar-chart-fill" data-pct="${c.pct}" style="width:0"></div></div>
            <div class="bar-chart-pct">${c.pct}%</div>
          </div>
        `);
      });

      setTimeout(() => {
        $('.bar-chart-fill').each(function () {
          $(this).css('width', $(this).data('pct') + '%');
        });
      }, 300);
    }

    const $stockBars = $('#stockBars');
    if ($stockBars.length) {
      $stockBars.empty();
      TunifyDashboardStats.lowStock.forEach(item => {
        const pct = Math.min(item.stock * 10, 100);
        $stockBars.append(`
          <div class="mb-3">
            <div class="d-flex justify-content-between mb-1">
              <span style="font-size:.78rem;color:var(--silver)">${item.name}</span>
              <span style="font-size:.72rem;font-family:var(--font-mono);color:var(--gold)">${item.stock} left</span>
            </div>
            <div class="progress" style="height:6px;background:var(--surface);border-radius:3px">
              <div class="progress-bar" style="width:${pct}%;background:var(--gold);border-radius:3px"></div>
            </div>
          </div>
        `);
      });
    }
  }

  function renderLowStock() {
    const $dashOrders = $('#dashOrders');
    if ($dashOrders.length) {
      $dashOrders.html(TunifyOrders.map(o => `
        <tr>
          <td>${o.id}</td>
          <td>${o.date}</td>
          <td>${o.items.join(', ')}</td>
          <td>₱${o.total.toLocaleString()}</td>
          <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
        </tr>
      `).join(''));
    }
  }

  function init() {
    try {
      renderStats();
      renderCharts();
      renderLowStock();
      Tunify.triggerFadeIn();
    } catch (err) {
      console.error('Error initializing dashboard page:', err);
    }
  }

  init();
});
