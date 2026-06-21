/* Tunify — shared navbar & footer */
const TunifyLayout = {
  async init(page) {
    try {
      console.log('TunifyLayout.init starting');
      
      // Load Navbar
      await this.renderNav();
      
      // Load Footer
      await this.renderFooter();
      
      // Initialize Common Tunify Features
      Tunify.initCommon(page);
      
      // Add Nav Split Click Handler
      this.setupNavSplitClick();
      
      console.log('TunifyLayout.init completed successfully');
    } catch (err) {
      console.error('Error in TunifyLayout.init:', err);
    }
  },

  setupNavSplitClick() {
    // Just let clicking the link navigate normally!
    // Dropdown is already handled by CSS hover!
    $(document).on('click', '.dropdown-toggle', function (e) {
      // Let the link navigate (only if not clicking the chevron)
      const isChevronClick = $(e.target).closest('i').length > 0 || $(e.target).hasClass('ml-05');
      if (!isChevronClick) {
        // Navigate normally
        const href = $(this).attr('href');
        if (href && href !== '#') {
          window.location.href = href;
        }
      } else {
        // If clicking chevron, prevent default just in case
        e.preventDefault();
      }
    });
  },

  async renderNav() {
    return new Promise((resolve, reject) => {
      $.get('components/navbar.html', (html) => {
        $('#tunifyNav').html(html);
        
        // Populate Brands in Nav
        Tunify.renderBrandNavMenu($('#navBrandMenu'));
        
        resolve();
      }).fail(err => {
        console.error('Failed to load navbar.html');
        reject(err);
      });
    });
  },

  async renderFooter() {
    return new Promise((resolve, reject) => {
      $.get('components/footer.html', (html) => {
        $('#tunifyFooter').html(html);
        resolve();
      }).fail(err => {
        console.error('Failed to load footer.html');
        reject(err);
      });
    });
  }
};
