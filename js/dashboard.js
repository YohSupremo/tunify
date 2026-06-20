/* Dashboard page */
$(document).ready(function () {
  const apiBaseUrl = 'http://localhost:5000/api/v1/';
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
    const token = sessionStorage.getItem('token');
    if (!token) return;

    $.ajax({
      method: "GET",
      url: `${apiBaseUrl}dashboard-stats`,
      dataType: "json",
      headers: {
        "Authorization": "Bearer " + JSON.parse(token)
      },
      success: function (data) {
        animateValue('#statRevenue', 0, data.revenue, 1200, v => '₱' + Math.round(v).toLocaleString());
        animateValue('#statOrders', 0, data.orders, 1000);
        animateValue('#statCustomers', 0, data.customers, 1000);
        $('#statLowStock').text(data.lowStock);
      },
      error: function (err) {
        console.error("Failed to load dashboard stats:", err);
      }
    });
  }

  function renderCharts() {
    const token = sessionStorage.getItem('token');
    const headers = token ? { "Authorization": "Bearer " + JSON.parse(token) } : {};

    const $chart = $('#categoryChart');
    if ($chart.length) {
      $.ajax({
        method: "GET",
        url: `${apiBaseUrl}category-chart`,
        dataType: "json",
        headers: headers,
        success: function (data) {
          $chart.empty();
          data.forEach((c) => {
            $chart.append(`
              <div class="bar-chart-row fade-in-up visible">
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
        },
        error: function (err) {
          console.error("Failed to load category chart:", err);
        }
      });
    }

    const $stockBars = $('#stockBars');
    if ($stockBars.length) {
      $.ajax({
        method: "GET",
        url: `${apiBaseUrl}stocks`,
        dataType: "json",
        success: function (data) {
          $stockBars.empty();
          const lowStockItems = data.filter(item => item.stock <= 5);
          lowStockItems.forEach(item => {
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
        },
        error: function (err) {
          console.error("Failed to load stock levels:", err);
        }
      });
    }
  }

  function renderLowStock() {
    const $dashOrders = $('#dashOrders');
    if (!$dashOrders.length) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    $.ajax({
      method: "GET",
      url: `${apiBaseUrl}orders`,
      dataType: "json",
      headers: {
        "Authorization": "Bearer " + JSON.parse(token)
      },
      success: function (dbOrders) {
        $dashOrders.html(dbOrders.slice(0, 5).map(o => `
          <tr>
            <td>${o.id}</td>
            <td>${o.date}</td>
            <td>${o.items.join(', ')}</td>
            <td>₱${o.total.toLocaleString()}</td>
            <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
          </tr>
        `).join(''));
      },
      error: function (err) {
        console.error("Failed to load dashboard orders:", err);
      }
    });
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
