(function() {
  'use strict';

  if (document.getElementById('kantata-fixed-fee-banner')) {
    return;
  }

  let currentEstimatedCost = null;
  let currentCurrency = '€';
  let mutationObserver = null;

  function createBanner() {
    const banner = document.createElement('div');
    banner.id = 'kantata-fixed-fee-banner';
    banner.innerHTML = `
      <div class="fixed-fee-section">
        <span class="fixed-fee-label">Estimated Cost:</span>
        <span class="fixed-fee-value" id="estimated-cost-display">Loading...</span>
      </div>
      <div class="fixed-fee-input-section">
        <span class="fixed-fee-label">Margin %:</span>
        <input type="number" id="fixed-fee-percentage" value="45" step="1">
      </div>
      <div class="fixed-fee-section">
        <span class="fixed-fee-label">Estimated Fee with Margin:</span>
        <span class="fixed-fee-value" id="calculated-fee-display">-</span>
      </div>
    `;

    document.body.appendChild(banner);

    const percentageInput = document.getElementById('fixed-fee-percentage');
    percentageInput.addEventListener('input', calculateAndDisplayFee);
    percentageInput.addEventListener('change', calculateAndDisplayFee);

    adjustBodyMargin();
    return banner;
  }

  function adjustBodyMargin() {
    const banner = document.getElementById('kantata-fixed-fee-banner');
    if (banner) {
      const bannerHeight = banner.offsetHeight;
      document.body.style.marginTop = `${bannerHeight}px`;
    }
  }

  function extractEstimatedCost() {
    let element = null;
    let costText = null;

    const testIdSelector = '[data-testid*="Total estimated cost"]';
    element = document.querySelector(testIdSelector);
    
    if (!element) {
      const allElements = document.querySelectorAll('*');
      for (let el of allElements) {
        if (el.textContent && el.textContent.includes('Est. Cost')) {
          const parent = el.closest('div');
          if (parent) {
            const contentEl = parent.querySelector('[class*="summary-item__content"]');
            if (contentEl) {
              element = contentEl;
              break;
            }
          }
        }
      }
    } else {
      const parent = element.closest('div');
      if (parent) {
        const contentEl = parent.querySelector('[class*="summary-item__content"]') || 
                          parent.querySelector('[class*="content"]');
        if (contentEl) {
          element = contentEl;
        }
      }
    }

    if (!element) {
      return { error: "Cannot find the Estimated Cost on this page" };
    }

    costText = element.textContent || element.innerText || '';
    
    if (!costText.trim()) {
      return { error: "Unable to parse cost value" };
    }

    const currencyMatch = costText.match(/[€£$]/);
    const currency = currencyMatch ? currencyMatch[0] : '€';

    let cleanText = costText
      .replace(/&nbsp;/g, ' ')
      .replace(/[€£$]/g, '')
      .replace(/[\s,]/g, '');

    const numericValue = parseFloat(cleanText);
    
    if (isNaN(numericValue)) {
      return { error: "Unable to parse cost value" };
    }

    return {
      value: numericValue,
      currency: currency,
      originalText: costText.trim()
    };
  }

  function formatCurrency(value, currency = '€') {
    const rounded = Math.round(value);
    const formatted = rounded.toLocaleString('en-US');
    return `${formatted} ${currency}`;
  }

  function calculateAndDisplayFee() {
    const percentageInput = document.getElementById('fixed-fee-percentage');
    const calculatedDisplay = document.getElementById('calculated-fee-display');
    
    if (!currentEstimatedCost || !percentageInput || !calculatedDisplay) {
      return;
    }

    const percentage = parseFloat(percentageInput.value) || 0;
    const multiplier = 1 + (percentage / 100);
    const calculatedFee = currentEstimatedCost * multiplier;
    
    calculatedDisplay.textContent = formatCurrency(calculatedFee, currentCurrency);
  }

  function updateEstimatedCost() {
    const costDisplay = document.getElementById('estimated-cost-display');
    if (!costDisplay) return;

    const result = extractEstimatedCost();
    
    if (result.error) {
      costDisplay.textContent = result.error;
      costDisplay.className = 'fixed-fee-value fixed-fee-error';
      currentEstimatedCost = null;
      const calculatedDisplay = document.getElementById('calculated-fee-display');
      if (calculatedDisplay) {
        calculatedDisplay.textContent = '-';
      }
    } else {
      currentEstimatedCost = result.value;
      currentCurrency = result.currency;
      costDisplay.textContent = formatCurrency(result.value, result.currency);
      costDisplay.className = 'fixed-fee-value';
      calculateAndDisplayFee();
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function startMonitoring() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    const debouncedUpdate = debounce(updateEstimatedCost, 500);

    mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (let mutation of mutations) {
        if (mutation.type === 'childList' || 
            (mutation.type === 'characterData' && 
             mutation.target.textContent && 
             (mutation.target.textContent.includes('€') || 
              mutation.target.textContent.includes('£') || 
              mutation.target.textContent.includes('$')))) {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        debouncedUpdate();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function cleanup() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    
    const banner = document.getElementById('kantata-fixed-fee-banner');
    if (banner) {
      banner.remove();
    }
    
    document.body.style.marginTop = '';
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          createBanner();
          updateEstimatedCost();
          startMonitoring();
        }, 1000);
      });
    } else {
      setTimeout(() => {
        createBanner();
        updateEstimatedCost();
        startMonitoring();
      }, 1000);
    }
  }

  window.kantataFixedFeeCleanup = cleanup;

  init();
})();