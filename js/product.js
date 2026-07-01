/* Product detail page — fetches live item from API.
   Reference: itcp237-js-ns-2026/js/home.js ($.ajax GET pattern) */
$(document).ready(function () {
  document.body.dataset.page = 'shop';
  loadNav();
  loadFooter();

  let qty = 1;

  /* ── Get product ID from URL ────────────────────────────────── */
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    window.location.href = 'shop.html';
    return;
  }

  /* ── Fetch item from API then render ────────────────────────── */
  /* Pattern: $.ajax GET → success callback renders the detail.
     Reference: itcp237-js-ns-2026/js/home.js lines 16-95         */
  $.ajax({
    method: 'GET',
    url: `${url}api/v1/items`,
    dataType: 'json',
    success: function (data) {
      const products = Array.isArray(data) ? data : (data.rows || []);
      const product = products.find(p => String(p.id) === String(id));

      if (!product) {
        window.location.href = 'shop.html';
        return;
      }

      render(product);
      bindEvents(product);
      renderRelated(products, product);
      initReviews(product.id);
    },
    error: function (error) {
      console.error('Product: failed to load items', error);
      window.location.href = 'shop.html';
    }
  });

  /* ── Render product detail ──────────────────────────────────── */
  function render(p) {
    document.title = `${p.name} — Tunify`;
    // Badge is rendered inline here (not inside a position:relative image
    // wrapper), so we use inline-block styling instead of the absolute-
    // positioned .prod-badge / .product-tag classes to prevent overlap.
    const badgeLabel = p.badge ? p.badge.toUpperCase() : 'FEATURED';
    const badgeBg = p.badge === 'sale' ? 'var(--gold-dim)' : p.badge === 'hot' ? 'var(--accent)' : p.badge === 'new' ? 'var(--accent)' : 'var(--gold)';
    const badgeColor = (p.badge === 'sale') ? '#fff' : '#000';
    $('#productBadge').html(`
      <span style="
        display: inline-block;
        background: ${badgeBg};
        color: ${badgeColor};
        font-family: var(--font-mono);
        font-size: .6rem;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        padding: .22rem .65rem;
        border-radius: 4px;
        margin-bottom: .5rem;
      ">${badgeLabel}</span>
    `);
    $('#productBrand').text(`${p.brand} · ${p.category}`);
    $('#productName').text(p.name);
    $('#productPrice').html(p.origPrice
      ? `<span class="original">₱${Number(p.origPrice).toLocaleString()}</span>₱${Number(p.price).toLocaleString()}`
      : `₱${Number(p.price).toLocaleString()}`
    );
    $('#productDesc').text(p.desc || '');
    $('#productStock').html(`<i class="fas fa-check-circle"></i> ${p.stock} in stock`);

    if (p.specs && Array.isArray(p.specs)) {
      $('#specList').html(p.specs.map(s => `<li><i class="fas fa-check"></i> ${s}</li>`).join(''));
    }

    let sortedImages = [];
    if (p.images && p.images.length > 0) {
      sortedImages = [...p.images].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return a.sort_order - b.sort_order;
      });

      let carouselHtml = '';
      sortedImages.forEach((img, i) => {
        carouselHtml += `
          <div class="carousel-item${i === 0 ? ' active' : ''}">
            <div class="product-detail-img">
              <img src="${img.image_path}" class="prod-detail-img-file img-fluid" alt="${p.name}" style="object-fit: contain; max-height: 400px; width: 100%;">
            </div>
          </div>
        `;
      });
      $('#productCarouselInner').html(carouselHtml);
    } else if (p.image) {
      $('#productCarouselInner').html(`
        <div class="carousel-item active"><div class="product-detail-img"><img src="${p.image}" class="prod-detail-img-file img-fluid" alt="${p.name}"></div></div>
      `);
    } else {
      $('#productCarouselInner').html(`
        <div class="carousel-item active"><div class="product-detail-img"><i class="fas fa-music"></i></div></div>
      `);
    }

    // Render thumbnails
    const $thumbs = $('#productThumbs');
    if ($thumbs.length) {
      $thumbs.empty();
      if (sortedImages.length > 0) {
        const maxVisible = 3;
        for (let i = 0; i < Math.min(sortedImages.length, maxVisible); i++) {
          const img = sortedImages[i];
          const isThirdWithMore = (i === 2 && sortedImages.length > maxVisible);
          const remCount = sortedImages.length - 2;

          let thumbHtml = '';
          if (isThirdWithMore) {
            thumbHtml = `
              <div class="thumb-item position-relative border rounded" data-slide-to="${i}" style="width: 80px; height: 80px; overflow: hidden; cursor: pointer; border-color: #3F3F51; transition: border-color 0.2s;">
                <img src="${img.image_path}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.4;">
                <div class="position-absolute d-flex align-items-center justify-content-center" style="top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); color: #fff; font-weight: bold; font-size: 1.2rem;">
                  +${remCount}
                </div>
              </div>
            `;
          } else {
            thumbHtml = `
              <div class="thumb-item border rounded" data-slide-to="${i}" style="width: 80px; height: 80px; overflow: hidden; cursor: pointer; border-color: #3F3F51; transition: border-color 0.2s;">
                <img src="${img.image_path}" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `;
          }
          $thumbs.append(thumbHtml);
        }

        // Add click events to thumbnails
        $('.thumb-item').on('click', function () {
          const slideTo = $(this).data('slide-to');
          if (slideTo === 2 && sortedImages.length > maxVisible) {
            // It's the "+N" thumbnail representing multiple hidden images
            const activeIndex = $('#productCarouselInner .carousel-item.active').index();
            if (activeIndex < 2) {
              $('#productCarousel').carousel(2);
            } else {
              // Cycle through remaining images (index 2 onwards)
              const nextIndex = activeIndex + 1;
              if (nextIndex < sortedImages.length) {
                $('#productCarousel').carousel(nextIndex);
              } else {
                $('#productCarousel').carousel(2); // Wrap back to the first hidden image
              }
            }
          } else {
            $('#productCarousel').carousel(slideTo);
          }
        });

        // Track carousel slide to highlight active thumbnail
        $('#productCarousel').off('slide.bs.carousel').on('slide.bs.carousel', function (e) {
          const index = e.to;
          $('.thumb-item').css('border-color', '#3F3F51');
          const highlightIndex = index >= 2 ? 2 : index;
          $(`.thumb-item[data-slide-to="${highlightIndex}"]`).css('border-color', 'var(--gold)');
        });

        // Highlight the first one initially
        $(`.thumb-item[data-slide-to="0"]`).css('border-color', 'var(--gold)');
      }
    }
  }

  /* ── Bind product-page events ───────────────────────────────── */
  function bindEvents(p) {
    if ($('#qtySpinner').length) {
      $('#qtySpinner').spinner({
        min: 1,
        max: p.stock,
        spin: function (e, ui) { qty = ui.value; }
      });
    }

    if ($('#productAccordion').length) {
      $('#productAccordion').accordion({
        collapsible: true,
        active: false,
        heightStyle: 'content'
      });
    }

    $('#addToCartBtn').on('click', function () {
      addToCart(p.id, qty, p.name, p.price, p.image, p.stock);
    });

    $('#wishlistBtn').on('click', function () {
      $(this).toggleClass('active');
      const on = $(this).hasClass('active');
      swalToast('success', on ? 'Added to wishlist' : 'Removed from wishlist');
    });

    $('#productCarousel').hover(
      function () { $(this).carousel('pause'); },
      function () { $(this).carousel('cycle'); }
    );
  }

  /* ── Render related products ────────────────────────────────── */
  function renderRelated(products, current) {
    const related = products
      .filter(p => p.category === current.category && String(p.id) !== String(current.id))
      .slice(0, 4);
    const $row = $('#relatedGrid');
    if (!$row.length) return;
    $row.empty();
    related.forEach(function (p) {
      $row.append(`
        <div class="col-6 col-md-4 col-lg-3 mb-4">
          <a class="prod-card h-100 d-block text-decoration-none" href="product.html?id=${p.id}">
            <div class="prod-img-area">
              ${p.badge ? `<span class="prod-badge badge-${p.badge}">${p.badge}</span>` : ''}
              ${p.image ? `<img src="${p.image}" class="prod-card-img img-fluid" alt="${p.name}">` : `<i class="fas fa-music"></i>`}
            </div>
            <div class="prod-body">
              <p class="prod-category">${p.category}</p>
              <p class="prod-name">${p.name}</p>
              <p class="prod-brand">${p.brand}</p>
              <div class="prod-footer">
                <div class="prod-price">₱${Number(p.price).toLocaleString()}</div>
                <button type="button" class="btn-add-cart"
                  data-id="${p.id}" data-desc="${p.name}"
                  data-price="${p.price}" data-image="${p.image || ''}"
                  data-stock="${p.stock}">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </a>
        </div>`);
    });
    Tunify.triggerFadeIn();

    $(document).on('click', '.btn-add-cart', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(this);
      addToCart($btn.data('id'), 1, $btn.data('desc'), $btn.data('price'), $btn.data('image'), $btn.data('stock'));
    });
  }

  /* ── Product Reviews Section ────────────────────────────────── */
  function initReviews(productId) {
    let tokenVal = null;
    const rawToken = sessionStorage.getItem('token');
    if (rawToken) {
      try {
        tokenVal = JSON.parse(rawToken);
      } catch (e) {
        tokenVal = rawToken;
      }
    }
    const loggedInUserId = sessionStorage.getItem('userId') ? JSON.parse(sessionStorage.getItem('userId')) : null;

    // Load reviews list
    function loadReviews() {
      $.ajax({
        method: 'GET',
        url: `${url}api/v1/items/${productId}/reviews`,
        dataType: 'json',
        success: function (res) {
          if (res && res.success) {
            // Render stars for the product summary header
            const avg = parseFloat(res.average_rating || 0);
            const count = parseInt(res.total_reviews || 0);
            
            // Render stars HTML
            let starsHtml = '';
            const fullStars = Math.floor(avg);
            const hasHalf = avg % 1 >= 0.5;
            for (let i = 1; i <= 5; i++) {
              if (i <= fullStars) {
                starsHtml += '<i class="fas fa-star" style="color: var(--gold);"></i>';
              } else if (i === fullStars + 1 && hasHalf) {
                starsHtml += '<i class="fas fa-star-half-alt" style="color: var(--gold);"></i>';
              } else {
                starsHtml += '<i class="far fa-star" style="color: var(--gold-dim);"></i>';
              }
            }

            // Render summary
            $('#reviewsSummary').html(`
              <div class="d-flex align-items-center mb-3">
                <div style="font-size: 2.2rem; font-weight: 800; color: #FFF5F5; margin-right: 15px; font-family: var(--font-display);">${avg.toFixed(1)}</div>
                <div>
                  <div style="font-size: 1.15rem; display: flex; gap: 2px;">${starsHtml}</div>
                  <div style="font-size: 0.8rem; color: var(--silver); margin-top: 2px;">Based on ${count} ${count === 1 ? 'review' : 'reviews'}</div>
                </div>
              </div>
            `);

            // Also update top productStars under title
            $('#productStars').html(`
              <div class="d-flex align-items-center" style="gap: 8px;">
                <span style="font-size: 0.9rem; display: flex; gap: 1px;">${starsHtml}</span>
                <span style="font-size: 0.78rem; color: var(--silver);">(${count})</span>
              </div>
            `);

            // Render reviews list
            const $list = $('#reviewsList');
            $list.empty();
            if (res.reviews.length === 0) {
              $list.html('<p style="color: var(--silver); font-size: 0.88rem;">No reviews for this product yet.</p>');
              return;
            }

            res.reviews.forEach(r => {
              let rStars = '';
              for (let i = 1; i <= 5; i++) {
                if (i <= r.rating) {
                  rStars += '<i class="fas fa-star" style="color: var(--gold); font-size: 0.75rem;"></i>';
                } else {
                  rStars += '<i class="far fa-star" style="color: var(--gold-dim); font-size: 0.75rem;"></i>';
                }
              }

              const isMyReview = loggedInUserId && Number(r.user_id) === Number(loggedInUserId);
              const actionButtons = isMyReview
                ? `<div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn btn-sm btn-outline-gold btn-edit-review" data-id="${r.id}" data-rating="${r.rating}" data-comment="${r.comment || ''}" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: transparent; border: 1px solid var(--gold); color: var(--gold); cursor: pointer;"><i class="fas fa-edit mr-1"></i>Edit</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-review" data-id="${r.id}" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid #ef4444; color: #ef4444; background: transparent; cursor: pointer;"><i class="fas fa-trash-alt mr-1"></i>Delete</button>
                   </div>`
                : '';

              const avatarHtml = r.customer_avatar 
                ? `<img src="${url}${r.customer_avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />`
                : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface2); color: var(--text); display: flex; align-items: center; justify-content: center; font-size: 0.75rem;"><i class="fas fa-user"></i></div>`;

              $list.append(`
                <div style="background: var(--surface); border: 1px solid var(--border); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-center" style="gap: 10px;">
                      ${avatarHtml}
                      <div>
                        <div style="font-weight: 600; font-size: 0.88rem; color: var(--text);">${r.customer_name}</div>
                        <div style="font-size: 0.72rem; color: var(--silver);">${r.date}</div>
                      </div>
                    </div>
                    <div style="display: flex; gap: 1px;">${rStars}</div>
                  </div>
                  <p style="color: var(--text); font-size: 0.85rem; margin-bottom: 0; line-height: 1.5; white-space: pre-line;">${r.comment || '<i>No comments provided.</i>'}</p>
                  ${actionButtons}
                </div>
              `);
            });
          }
        },
        error: function (err) {
          console.error("Failed to load reviews:", err);
          $('#reviewsList').html('<p style="color: #f87171;">Could not load reviews.</p>');
        }
      });
    }

    // Check review form eligibility
    function checkEligibility() {
      if (!tokenVal) {
        $('#reviewEligibilityMessage').html('Please <a href="login.html" style="color: var(--gold); text-decoration: underline;">log in</a> to write a review for this product.');
        $('#reviewFormContainer').hide();
        return;
      }

      $.ajax({
        method: 'GET',
        url: `${url}api/v1/items/${productId}/review-eligibility`,
        dataType: 'json',
        headers: {
          'Authorization': 'Bearer ' + tokenVal
        },
        success: function (res) {
          if (res && res.success) {
            if (res.eligible) {
              $('#reviewFormContainer').show();
              $('#reviewEligibilityMessage').hide();

              // Pre-fill existing review details if editing
              if (res.already_reviewed && res.existing_review) {
                $('#reviewFormContainer h4').html('<i class="fas fa-edit mr-1"></i> Edit Your Review');
                $('#btnSubmitReview').html('<i class="fas fa-save mr-1"></i> Update Review');
                $('#reviewRatingInput').val(res.existing_review.rating);
                $('#reviewCommentInput').val(res.existing_review.comment || '');
                updateStarDisplay(res.existing_review.rating);
              }
            } else {
              $('#reviewFormContainer').hide();
              $('#reviewEligibilityMessage').html('<i class="fas fa-info-circle mr-1"></i> Only customers who have purchased and received (Delivered status) this product can submit a review.');
            }
          }
        },
        error: function (err) {
          console.error("Failed to check review eligibility:", err);
        }
      });
    }

    // Helper: Update Star Selection UI
    function updateStarDisplay(rating) {
      $('.rating-stars-input .star-btn').each(function () {
        const val = parseInt($(this).data('value'));
        if (val <= rating) {
          $(this).removeClass('far').addClass('fas').css('color', 'var(--gold)');
        } else {
          $(this).removeClass('fas').addClass('far').css('color', 'var(--gold-dim)');
        }
      });
    }

    // Handle Star Clicks
    $(document).off('click', '.rating-stars-input .star-btn').on('click', '.rating-stars-input .star-btn', function () {
      const val = parseInt($(this).data('value'));
      $('#reviewRatingInput').val(val);
      updateStarDisplay(val);
    });

    // Handle Star Hover effects
    $(document).off('mouseenter', '.rating-stars-input .star-btn').on('mouseenter', '.rating-stars-input .star-btn', function () {
      const val = parseInt($(this).data('value'));
      $('.rating-stars-input .star-btn').each(function () {
        const starVal = parseInt($(this).data('value'));
        if (starVal <= val) {
          $(this).css('color', 'var(--gold)');
        } else {
          $(this).css('color', 'var(--gold-dim)');
        }
      });
    }).off('mouseleave', '.rating-stars-input').on('mouseleave', '.rating-stars-input', function () {
      const activeRating = parseInt($('#reviewRatingInput').val() || 0);
      updateStarDisplay(activeRating);
    });

    // Submit Review Button Click
    $('#btnSubmitReview').off('click').on('click', function (e) {
      e.preventDefault();
      const rating = parseInt($('#reviewRatingInput').val() || 0);
      const comment = $('#reviewCommentInput').val().trim();

      if (rating === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Rating Required',
          text: 'Please select a star rating between 1 and 5.'
        });
        return;
      }

      const $btn = $(this);
      $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Submitting…');

      $.ajax({
        method: 'POST',
        url: `${url}api/v1/reviews`,
        data: JSON.stringify({ item_id: productId, rating, comment }),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        headers: {
          'Authorization': 'Bearer ' + tokenVal
        },
        success: function (res) {
          $btn.prop('disabled', false).html('<i class="fas fa-paper-plane mr-1"></i> Submit Review');
          if (res && res.success) {
            Swal.fire({
              icon: 'success',
              title: 'Review Submitted',
              text: res.message,
              showConfirmButton: false,
              timer: 1500,
              timerProgressBar: true,
              position: 'bottom-right'
            });
            loadReviews();
            checkEligibility();
          }
        },
        error: function (err) {
          $btn.prop('disabled', false).html('<i class="fas fa-paper-plane mr-1"></i> Submit Review');
          const errMsg = err.responseJSON && err.responseJSON.error ? err.responseJSON.error : 'Failed to submit review.';
          Swal.fire({
            icon: 'error',
            title: 'Submission Failed',
            text: errMsg
          });
        }
      });
    });

    // Handle Edit Review click
    $(document).off('click', '.btn-edit-review').on('click', '.btn-edit-review', function () {
      const rating = $(this).data('rating');
      const comment = $(this).data('comment');

      // Scroll to review form container
      $('html, body').animate({
        scrollTop: $("#reviewFormContainer").offset().top - 150
      }, 500);

      // Pre-fill fields
      $('#reviewFormContainer h4').html('<i class="fas fa-edit mr-1"></i> Edit Your Review');
      $('#btnSubmitReview').html('<i class="fas fa-save mr-1"></i> Update Review');
      $('#reviewRatingInput').val(rating);
      $('#reviewCommentInput').val(comment);
      updateStarDisplay(rating);
    });

    // Handle Delete Review click
    $(document).off('click', '.btn-delete-review').on('click', '.btn-delete-review', function () {
      const reviewId = $(this).data('id');
      if (!tokenVal) return;

      Swal.fire({
        title: 'Delete Review?',
        text: 'Are you sure you want to delete your review? This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#FBBF24',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          $.ajax({
            method: 'DELETE',
            url: `${url}api/v1/reviews/${reviewId}`,
            dataType: 'json',
            headers: {
              'Authorization': 'Bearer ' + tokenVal
            },
            success: function (res) {
              if (res && res.success) {
                Swal.fire({
                  icon: 'success',
                  title: 'Deleted!',
                  text: 'Your review has been deleted.',
                  showConfirmButton: false,
                  timer: 1500,
                  timerProgressBar: true,
                  position: 'bottom-right'
                });
                
                // Clear fields and reset form state
                $('#reviewFormContainer h4').html('<i class="fas fa-paper-plane mr-1"></i> Write a Review');
                $('#btnSubmitReview').html('<i class="fas fa-paper-plane mr-1"></i> Submit Review');
                $('#reviewRatingInput').val(0);
                $('#reviewCommentInput').val('');
                updateStarDisplay(0);

                loadReviews();
                checkEligibility();
              }
            },
            error: function (err) {
              const errMsg = err.responseJSON && err.responseJSON.error ? err.responseJSON.error : 'Failed to delete review.';
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errMsg
              });
            }
          });
        }
      });
    });

    // Initialize Reviews
    loadReviews();
    checkEligibility();
  }

});
