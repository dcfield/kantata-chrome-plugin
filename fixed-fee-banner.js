(function() {
  'use strict';

  if (document.getElementById('kantata-fixed-fee-banner')) {
    return;
  }

  let currentEstimatedCost = null;
  let currentCurrency = '€';
  let currentWorkingWeeks = null;
  let currentHighestHours = null;
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
        <button id="calculate-fee-btn" class="calculate-btn">Calculate Fee</button>
      </div>
      <div class="fixed-fee-input-section">
        <span class="fixed-fee-label">Estimated Fee with Margin:</span>
        <input type="number" id="calculated-fee-input" step="1" min="0" placeholder="0">
        <button id="calculate-margin-btn" class="calculate-btn">Calculate Margin</button>
      </div>
      <div class="fixed-fee-section">
        <span class="fixed-fee-label">Estimated Duration:</span>
        <span class="fixed-fee-value" id="working-weeks-display">Loading...</span>
        <div class="working-weeks-tooltip" id="working-weeks-tooltip">
          <div class="tooltip-content" id="tooltip-content">
            Calculation Breakdown:<br>
            Highest Resource Hours: <span id="tooltip-hours">-</span>h<br>
            ÷ 8 hours per day = <span id="tooltip-days">-</span> working days<br>
            ÷ 5 days per week = <span id="tooltip-weeks">-</span> working weeks
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const percentageInput = document.getElementById('fixed-fee-percentage');
    const feeInput = document.getElementById('calculated-fee-input');
    const calculateFeeBtn = document.getElementById('calculate-fee-btn');
    const calculateMarginBtn = document.getElementById('calculate-margin-btn');
    const workingWeeksDisplay = document.getElementById('working-weeks-display');
    const tooltip = document.getElementById('working-weeks-tooltip');
    
    calculateFeeBtn.addEventListener('click', () => calculateFromPercentage());
    calculateMarginBtn.addEventListener('click', () => calculateFromFee());

    // Add tooltip functionality
    if (workingWeeksDisplay && tooltip) {
      workingWeeksDisplay.addEventListener('mouseenter', (e) => {
        tooltip.style.display = 'block';
        positionTooltip(e, tooltip);
      });
      workingWeeksDisplay.addEventListener('mousemove', (e) => {
        positionTooltip(e, tooltip);
      });
      workingWeeksDisplay.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    }

    adjustBodyMargin();
    return banner;
  }

  function positionTooltip(event, tooltip) {
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const offset = 15;
    
    // Position tooltip below and slightly to the right of mouse
    tooltip.style.left = `${mouseX + offset}px`;
    tooltip.style.top = `${mouseY + offset}px`;
    
    // Check if tooltip would go off-screen and adjust
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position if off-screen
    if (tooltipRect.right > viewportWidth) {
      tooltip.style.left = `${mouseX - tooltipRect.width - offset}px`;
    }
    
    // Adjust vertical position if off-screen
    if (tooltipRect.bottom > viewportHeight) {
      tooltip.style.top = `${mouseY - tooltipRect.height - offset}px`;
    }
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

  function extractResourceHours() {
    // Exclude summary/total rows by looking for individual team member rows only
    const hoursElements = document.querySelectorAll(
      'tr:not(.summary-row_styles__summaryRow--O3aJq) [data-resizable-column-id="Project::Overview::TeamMembers::Columns::ResourceHours"] .cells_styles__time-container--KQFrG, ' +
      'tr:not(.summary-row_styles__summaryRow--O3aJq) [data-resizable-column-id="Project::Overview::TeamMembers::Columns::ResourceHours"] [class*="time-container"]'
    );

    if (hoursElements.length === 0) {
      return { error: "Cannot find Team Members table" };
    }

    let maxHours = 0;
    let foundValidData = false;

    hoursElements.forEach(element => {
      // Skip if this element is in a summary row (additional check)
      const row = element.closest('tr');
      if (row && (row.classList.contains('summary-row_styles__summaryRow--O3aJq') || 
                  row.querySelector('.cells_styles__truncate--wfo9z')?.textContent?.toLowerCase().includes('total'))) {
        return;
      }

      const text = element.textContent || element.innerText || '';
      const hoursMatch = text.match(/^(\d+)h$/); // More strict matching - must be exactly "digits+h"
      
      if (hoursMatch) {
        const hours = parseInt(hoursMatch[1], 10);
        if (hours > 0) {
          foundValidData = true;
          maxHours = Math.max(maxHours, hours);
          console.log(`Found resource hours: ${hours}h, current max: ${maxHours}h`);
        }
      }
    });

    if (!foundValidData) {
      return { error: "No valid resource hours found" };
    }

    console.log(`Final highest resource hours: ${maxHours}h`);
    return { hours: maxHours };
  }

  function calculateWorkingWeeks(hours) {
    if (!hours || hours <= 0) {
      return { error: "Invalid hours value" };
    }

    const workingDays = hours / 8;
    const workingWeeks = workingDays / 5;
    
    return {
      hours: hours,
      workingDays: workingDays,
      workingWeeks: Math.round(workingWeeks * 10) / 10
    };
  }

  function formatCurrency(value, currency = '€') {
    const rounded = Math.round(value);
    const formatted = rounded.toLocaleString('en-US');
    return `${formatted} ${currency}`;
  }

  let isUpdating = false;

  function calculateFromPercentage() {
    if (isUpdating) return;
    isUpdating = true;

    const percentageInput = document.getElementById('fixed-fee-percentage');
    const feeInput = document.getElementById('calculated-fee-input');
    
    if (!currentEstimatedCost || !percentageInput || !feeInput) {
      isUpdating = false;
      return;
    }

    const percentage = parseFloat(percentageInput.value) || 0;
    const multiplier = 1 + (percentage / 100);
    const calculatedFee = currentEstimatedCost * multiplier;
    
    feeInput.value = Math.round(calculatedFee);
    
    isUpdating = false;
  }

  function calculateFromFee() {
    if (isUpdating) return;
    isUpdating = true;

    const percentageInput = document.getElementById('fixed-fee-percentage');
    const feeInput = document.getElementById('calculated-fee-input');
    
    if (!currentEstimatedCost || !percentageInput || !feeInput) {
      isUpdating = false;
      return;
    }

    const targetFee = parseFloat(feeInput.value) || 0;
    
    if (currentEstimatedCost === 0) {
      percentageInput.value = 0;
      isUpdating = false;
      return;
    }

    const multiplier = targetFee / currentEstimatedCost;
    const percentage = (multiplier - 1) * 100;
    
    percentageInput.value = Math.round(percentage * 10) / 10;
    
    isUpdating = false;
  }

  function updateWorkingWeeks() {
    const workingWeeksDisplay = document.getElementById('working-weeks-display');
    if (!workingWeeksDisplay) return;

    const hoursResult = extractResourceHours();
    
    if (hoursResult.error) {
      workingWeeksDisplay.textContent = hoursResult.error;
      workingWeeksDisplay.className = 'fixed-fee-value fixed-fee-error';
      currentWorkingWeeks = null;
      currentHighestHours = null;
      updateTooltip(null, null);
    } else {
      const calculationResult = calculateWorkingWeeks(hoursResult.hours);
      
      if (calculationResult.error) {
        workingWeeksDisplay.textContent = calculationResult.error;
        workingWeeksDisplay.className = 'fixed-fee-value fixed-fee-error';
        currentWorkingWeeks = null;
        currentHighestHours = null;
        updateTooltip(null, null);
      } else {
        currentWorkingWeeks = calculationResult.workingWeeks;
        currentHighestHours = calculationResult.hours;
        workingWeeksDisplay.textContent = `${calculationResult.workingWeeks} working weeks`;
        workingWeeksDisplay.className = 'fixed-fee-value';
        updateTooltip(calculationResult);
      }
    }
  }

  function updateTooltip(calculationResult) {
    const tooltipHours = document.getElementById('tooltip-hours');
    const tooltipDays = document.getElementById('tooltip-days');
    const tooltipWeeks = document.getElementById('tooltip-weeks');

    if (!calculationResult || !tooltipHours || !tooltipDays || !tooltipWeeks) {
      if (tooltipHours) tooltipHours.textContent = '-';
      if (tooltipDays) tooltipDays.textContent = '-';
      if (tooltipWeeks) tooltipWeeks.textContent = '-';
      return;
    }

    tooltipHours.textContent = calculationResult.hours;
    tooltipDays.textContent = calculationResult.workingDays.toFixed(1);
    tooltipWeeks.textContent = calculationResult.workingWeeks;
  }

  function updateEstimatedCost() {
    const costDisplay = document.getElementById('estimated-cost-display');
    if (!costDisplay) return;

    const result = extractEstimatedCost();
    
    if (result.error) {
      costDisplay.textContent = result.error;
      costDisplay.className = 'fixed-fee-value fixed-fee-error';
      currentEstimatedCost = null;
      const feeInput = document.getElementById('calculated-fee-input');
      const calculateFeeBtn = document.getElementById('calculate-fee-btn');
      const calculateMarginBtn = document.getElementById('calculate-margin-btn');
      if (feeInput) {
        feeInput.value = '';
        feeInput.disabled = true;
      }
      if (calculateFeeBtn) {
        calculateFeeBtn.disabled = true;
      }
      if (calculateMarginBtn) {
        calculateMarginBtn.disabled = true;
      }
    } else {
      currentEstimatedCost = result.value;
      currentCurrency = result.currency;
      costDisplay.textContent = formatCurrency(result.value, result.currency);
      costDisplay.className = 'fixed-fee-value';
      const feeInput = document.getElementById('calculated-fee-input');
      const calculateFeeBtn = document.getElementById('calculate-fee-btn');
      const calculateMarginBtn = document.getElementById('calculate-margin-btn');
      if (feeInput) {
        feeInput.disabled = false;
      }
      if (calculateFeeBtn) {
        calculateFeeBtn.disabled = false;
      }
      if (calculateMarginBtn) {
        calculateMarginBtn.disabled = false;
      }
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

    const debouncedUpdate = debounce(() => {
      updateEstimatedCost();
      updateWorkingWeeks();
    }, 500);

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
          updateWorkingWeeks();
          startMonitoring();
        }, 1000);
      });
    } else {
      setTimeout(() => {
        createBanner();
        updateEstimatedCost();
        updateWorkingWeeks();
        startMonitoring();
      }, 1000);
    }
  }

  window.kantataFixedFeeCleanup = cleanup;

  init();
})();