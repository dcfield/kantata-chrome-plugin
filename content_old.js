const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

function extractHoursFromDiv(div) {
    if (!div) return null;
    const value = div.querySelector('div');
    return value ? value.innerText.trim() : null;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function simulateClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    el.dispatchEvent(new MouseEvent('mousedown', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    }));

    el.dispatchEvent(new MouseEvent('mouseup', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    }));

    el.dispatchEvent(new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    }));
}


async function simulateTyping(input, value) {
    console.log(`[AutoFill] Simulating typing: ${value}`);

    simulateClick(input);
    console.log("[AutoFill] Simulated click");

    await wait(150);

    input.focus();
    input.select();
    input.setRangeText('');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    console.log("[AutoFill] Cleared input");

    await wait(150);

    for (let char of `${value}h`) {
        const keyCode = char.charCodeAt(0);
        const keyEventInit = {
            key: char,
            char: char,
            keyCode,
            which: keyCode,
            bubbles: true,
        };

        input.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
        input.value += char;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));
        console.log(`[AutoFill] Typed character: ${char}`);

        await wait(120);
    }

    await wait(200);

    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
    console.log("[AutoFill] Dispatched 'change' and blur");

    await wait(500);
}

function setReactInputValue(input, value) {
    nativeInputValueSetter.call(input, value);
    const event = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertReplacementText',
        data: value,
    });
    input.dispatchEvent(event);
}


async function fillEstimates() {
    console.log("[AutoFill] Running fillEstimates...");

    const taskRows = document.querySelectorAll(
        '.task-details_task-details__workspace-task-row--IyQKB.task-details_task-details__task-row--unI2Y'
    );

    console.log(`[AutoFill] Found ${taskRows.length} task rows.`);

    for (let [index, row] of taskRows.entries()) {
        console.log(`[AutoFill] Processing row ${index + 1}`);

        const timeBlocks = row.querySelectorAll('.time-totals_time-totals__single-total--ibBop');
        let scheduledValue = null;
        let estimateInput = null;

        timeBlocks.forEach((block) => {
            const label = block.querySelector('.time-totals_time-totals__time-label--Ugf4M');
            const valueContainer = block.querySelector('.time-totals_time-totals__time-totals--hmtwK');

            if (label && valueContainer) {
                const labelText = label.textContent.trim();

                if (labelText === 'Sch') {
                    const valueDiv = valueContainer.querySelector('div');
                    if (valueDiv) {
                        const rawValue = valueDiv.textContent.trim();
                        scheduledValue = rawValue.endsWith('k')
                            ? parseFloat(rawValue) * 1000
                            : rawValue;
                        console.log(`[AutoFill] Found Sch = ${scheduledValue}`);
                    }
                }

                if (labelText === 'Est') {
                    estimateInput = block.querySelector('input.time-totals_time-totals__estimated-hours-input--ubKIX');
                    if (estimateInput) {
                        console.log(`[AutoFill] Found Est input field.`);
                    }
                }
            }
        });

        if (scheduledValue && estimateInput) {
            await simulateTyping(estimateInput, scheduledValue.toString());
        } else {
            console.warn(`[AutoFill] Skipped row ${index + 1} — missing Sch or Est`);
        }
    }

    console.log("[AutoFill] All done.");
}




// Listen for popup.js message
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "fill-estimates") {
        fillEstimates();
        sendResponse({ status: "done" });
    }
});
