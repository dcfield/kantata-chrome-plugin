(function() {
  'use strict';

  if (document.getElementById('kantata-fixed-fee-banner')) {
    return;
  }

  let currentEstimatedCost = null;
  let currentCurrency = '€';
  let currentWorkingWeeks = null;
  let currentHighestHours = null;
  let currentPrechecks = null;
  let mutationObserver = null;

  function createBanner() {
    const banner = document.createElement('div');
    banner.id = 'kantata-fixed-fee-banner';
    banner.innerHTML = `
      <div class="banner-main-content">
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
      </div>
      <div class="prechecks-wrapper" id="prechecks-section" style="display: none;">
        <div class="prechecks-title">Project Checks:</div>
        <ul class="prechecks-list" id="prechecks-display">
        </ul>
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
      // Use requestAnimationFrame to ensure the banner is fully rendered
      requestAnimationFrame(() => {
        const bannerHeight = banner.offsetHeight;
        // Add a small buffer for the box shadow (8px shadow + 4px extra spacing)
        const marginTop = bannerHeight + 12;
        document.body.style.marginTop = `${marginTop}px`;
        console.log(`Banner height: ${bannerHeight}px, setting body margin-top to: ${marginTop}px`);
      });
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

  function getTeamMemberRows() {
    // Find all tables on the page
    const tables = document.querySelectorAll('table.overview_styles__overview-table--sGEtL');
    let teamMembersTable = null;
    
    // Find the table that contains Team Members columns (not Project Summary)
    for (let table of tables) {
      const teamMemberResourceHeader = table.querySelector('[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"]');
      if (teamMemberResourceHeader) {
        teamMembersTable = table;
        break;
      }
    }
    
    if (!teamMembersTable) {
      console.log('Could not find Team Members table');
      return [];
    }
    
    // Get all non-summary rows from this specific table
    const rows = teamMembersTable.querySelectorAll(
      'tr.table_table__row--HopJF:not(.summary-row_styles__summaryRow--O3aJq)'
    );
    
    // Filter to only include rows that have the Team Members Resource column
    const teamMemberRows = [];
    rows.forEach((row, index) => {
      const resourceCell = row.querySelector('[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"]');
      if (resourceCell) {
        teamMemberRows.push(row);
      }
    });
    
    console.log(`Found ${teamMemberRows.length} team member rows`);
    return teamMemberRows;
  }

  function extractResourceName(row, index) {
    // Try multiple selectors to find the resource name
    const nameSelectors = [
      // Primary: Resource card name span (from HTML example)
      '[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"] .cards_resource-card__resourceCardName--lLbGa span',
      '[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"] [class*="resourceCardName"] span',
      // Fallback: Any span in the resource cell
      '[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"] span',
      // Alternative: title attribute on the resource card div
      '[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"] [class*="resource-info-card"]',
      // More generic fallbacks
      '[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"] [class*="truncate"]',
      '[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Resource"]'
    ];

    for (let selector of nameSelectors) {
      const nameElement = row.querySelector(selector);
      if (nameElement) {
        // Try textContent first
        let name = (nameElement.textContent || nameElement.innerText || '').trim();
        
        // If no text content, try title attribute (from HTML example: title="Earl Gaylard ")
        if (!name && nameElement.hasAttribute('title')) {
          name = nameElement.getAttribute('title').trim();
        }
        
        // Validate the name (exclude currency, hours, numbers)
        if (name && name !== '' && !name.match(/^[£$€]/) && !name.match(/^\d+h?$/) && !name.match(/^[\d.,\s]+$/)) {
          console.log(`Found resource name: "${name}" using selector: ${selector}`);
          return name;
        }
      }
    }

    // If no name found, log the row structure for debugging
    console.log(`Could not find name for row ${index + 1}, row HTML:`, row.innerHTML.substring(0, 400));
    
    return `Resource ${index + 1}`;
  }

  function extractCostRates() {
    const costRateResults = [];
    const rows = getTeamMemberRows();

    rows.forEach((row, index) => {
      const resourceName = extractResourceName(row, index);
      const costRateCell = row.querySelector('[data-resizable-column-id="Project::Overview::TeamMembers::Columns::CostRate"] .cells_styles__money-container--qkZv5');
      
      if (costRateCell) {
        const costText = (costRateCell.textContent || costRateCell.innerText || '').trim();
        costRateResults.push({
          rowIndex: index,
          resourceName: resourceName,
          value: costText,
          isZeroCost: isZeroCost(costText)
        });
      } else {
        costRateResults.push({
          rowIndex: index,
          resourceName: resourceName,
          value: '',
          isZeroCost: true
        });
      }
    });

    return costRateResults;
  }

  function extractResourceEstimatedHours() {
    const hoursResults = [];
    const rows = getTeamMemberRows();

    rows.forEach((row, index) => {
      const resourceName = extractResourceName(row, index);
      const hoursCell = row.querySelector('[data-resizable-column-id="Project::Overview::TeamMembers::Columns::ResourceHours"] .cells_styles__time-container--KQFrG');
      
      if (hoursCell) {
        const hoursText = (hoursCell.textContent || hoursCell.innerText || '').trim();
        hoursResults.push({
          rowIndex: index,
          resourceName: resourceName,
          value: hoursText,
          isZeroHours: isZeroHours(hoursText)
        });
      } else {
        hoursResults.push({
          rowIndex: index,
          resourceName: resourceName,
          value: '',
          isZeroHours: true
        });
      }
    });

    return hoursResults;
  }

  function extractRoles() {
    const roleResults = [];
    const rows = getTeamMemberRows();

    rows.forEach((row, index) => {
      const roleCell = row.querySelector('[data-resizable-column-id="Project::Overview::TeamMembers::Columns::Role"] .cells_styles__truncate--wfo9z');
      
      if (roleCell) {
        const roleText = (roleCell.textContent || roleCell.innerText || '').trim();
        roleResults.push({
          rowIndex: index,
          value: roleText || 'Unassigned'
        });
      } else {
        roleResults.push({
          rowIndex: index,
          value: 'Unassigned'
        });
      }
    });

    return roleResults;
  }

  function isZeroCost(value) {
    if (!value || value.trim() === '') return true;
    return !!value.match(/^[£$€]?0\.00$/);
  }

  function isZeroHours(value) {
    if (!value || value.trim() === '') return true;
    return value === '0h';
  }

  function performPrechecks() {
    try {
      const rows = getTeamMemberRows();
      
      if (rows.length === 0) {
        return { error: "No team member data available for analysis" };
      }

      const costRates = extractCostRates();
      const resourceHours = extractResourceEstimatedHours();
      const roles = extractRoles();

      const zeroCostResources = costRates.filter(item => item.isZeroCost);
      const zeroHoursResources = resourceHours.filter(item => item.isZeroHours);

      const roleCounts = {};
      roles.forEach(roleItem => {
        const role = roleItem.value;
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });

      const sortedRoles = Object.entries(roleCounts)
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }
          return a[0].localeCompare(b[0]);
        });

      let currency = '£';
      if (zeroCostResources.length > 0) {
        const firstCostValue = costRates.find(item => item.value && item.value.match(/[£$€]/));
        if (firstCostValue) {
          const currencyMatch = firstCostValue.value.match(/([£$€])/);
          if (currencyMatch) {
            currency = currencyMatch[1];
          }
        }
      }

      return {
        zeroCostCount: zeroCostResources.length,
        zeroCostResources: zeroCostResources.map(item => item.resourceName),
        zeroHoursCount: zeroHoursResources.length,
        zeroHoursResources: zeroHoursResources.map(item => item.resourceName),
        currency: currency,
        roleDistribution: sortedRoles,
        totalResources: rows.length
      };

    } catch (error) {
      console.error('Error performing prechecks:', error);
      return { error: "Error analyzing team member data" };
    }
  }

  function formatPrechecksDisplay(prechecks) {
    if (prechecks.error) {
      return { html: `<li class="precheck-error">${prechecks.error}</li>`, isError: true };
    }

    const listItems = [];
    
    if (prechecks.zeroCostCount > 0) {
      const resourceNames = prechecks.zeroCostResources.join(', ');
      listItems.push(`<li class="precheck-warning precheck-tooltip" data-tooltip="Resources: ${resourceNames}">⚠️ ${prechecks.zeroCostCount} resources with ${prechecks.currency}0.00 cost rate</li>`);
    }
    
    if (prechecks.zeroHoursCount > 0) {
      const resourceNames = prechecks.zeroHoursResources.join(', ');
      listItems.push(`<li class="precheck-warning precheck-tooltip" data-tooltip="Resources: ${resourceNames}">⚠️ ${prechecks.zeroHoursCount} resource${prechecks.zeroHoursCount > 1 ? 's' : ''} with 0h estimated hours</li>`);
    }

    if (prechecks.roleDistribution && prechecks.roleDistribution.length > 0) {
      const roleStrings = prechecks.roleDistribution.map(([role, count]) => `${role}: ${count}`);
      const roleText = roleStrings.join(', ');
      listItems.push(`<li class="precheck-roles">👥 Team: ${roleText}</li>`);
    }

    if (listItems.length === 0) {
      return { html: '<li class="precheck-info">No data available</li>', isError: false };
    }

    return {
      html: listItems.join(''),
      isError: false
    };
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

  function updatePrechecks() {
    const prechecksSection = document.getElementById('prechecks-section');
    const prechecksDisplay = document.getElementById('prechecks-display');
    
    if (!prechecksSection || !prechecksDisplay) return;

    const prechecks = performPrechecks();
    const formatted = formatPrechecksDisplay(prechecks);
    
    currentPrechecks = prechecks;
    
    prechecksDisplay.innerHTML = formatted.html;
    
    if (formatted.isError) {
      prechecksSection.style.display = 'none';
    } else {
      prechecksSection.style.display = 'block';
      
      if (formatted.html.includes('No data available')) {
        prechecksSection.style.display = 'none';
      }
    }
    
    console.log('Prechecks updated:', prechecks);
    
    // Add tooltip functionality to precheck items
    setupPrecheckTooltips();
    
    // Recalculate body margin since prechecks section may have changed banner height
    adjustBodyMargin();
  }

  function setupPrecheckTooltips() {
    const tooltipElements = document.querySelectorAll('.precheck-tooltip');
    
    tooltipElements.forEach(element => {
      element.addEventListener('mouseenter', showPrecheckTooltip);
      element.addEventListener('mousemove', positionPrecheckTooltip);
      element.addEventListener('mouseleave', hidePrecheckTooltip);
    });
  }

  function showPrecheckTooltip(event) {
    const element = event.currentTarget;
    const tooltipText = element.getAttribute('data-tooltip');
    
    if (!tooltipText) return;
    
    // Remove any existing tooltip
    hidePrecheckTooltip();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'precheck-tooltip-popup';
    tooltip.textContent = tooltipText;
    tooltip.id = 'precheck-active-tooltip';
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    positionPrecheckTooltip(event);
  }

  function positionPrecheckTooltip(event) {
    const tooltip = document.getElementById('precheck-active-tooltip');
    if (!tooltip) return;
    
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const offset = 10;
    
    // Position tooltip below and to the right of mouse
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

  function hidePrecheckTooltip() {
    const existingTooltip = document.getElementById('precheck-active-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
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
      updatePrechecks();
      // Ensure body margin is adjusted after any content updates
      adjustBodyMargin();
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
    
    // Clean up tooltips
    hidePrecheckTooltip();
    
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
          updatePrechecks();
          startMonitoring();
        }, 1000);
      });
    } else {
      setTimeout(() => {
        createBanner();
        updateEstimatedCost();
        updateWorkingWeeks();
        updatePrechecks();
        startMonitoring();
      }, 1000);
    }
  }

  window.kantataFixedFeeCleanup = cleanup;

  init();
})();