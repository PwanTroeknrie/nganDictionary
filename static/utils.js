// 工具函数

/**
 * Initializes the input history for undo/redo functionality.
 * @param {HTMLInputElement[]} inputs - The input elements to track.
 * @returns {Object} The history object and history index.
 */
export function initializeInputHistory(inputs) {
    const inputHistory = {};
    const historyIndex = {};

    inputs.forEach(input => {
        inputHistory[input.id] = [input.value];
        historyIndex[input.id] = 0;
    });

    return { inputHistory, historyIndex };
}

/**
 * Records input history for undo/redo functionality.
 * @param {Event} e - The input event.
 * @param {Object} inputHistory - The history object.
 * @param {Object} historyIndex - The history index.
 */
export function recordHistory(e, inputHistory, historyIndex) {
    const input = e.target;
    const { id, value } = input;

    if (historyIndex[id] < inputHistory[id].length - 1) {
        inputHistory[id] = inputHistory[id].slice(0, historyIndex[id] + 1);
    }

    inputHistory[id].push(value);
    historyIndex[id] = inputHistory[id].length - 1;
}

/**
 * Handles undo/redo keyboard shortcuts.
 * @param {Event} event - The keyboard event.
 * @param {HTMLInputElement[]} formInputs - The form input elements.
 * @param {Object} inputHistory - The history object.
 * @param {Object} historyIndex - The history index.
 */
export function handleUndoRedo(event, formInputs, inputHistory, historyIndex) {
    if (event.ctrlKey) {
        const activeInput = document.activeElement;
        if (!formInputs.includes(activeInput)) return;

        const { id } = activeInput;
        if (event.key.toLowerCase() === 'z') {
            event.preventDefault();

            if (event.shiftKey) {
                // Redo
                if (historyIndex[id] < inputHistory[id].length - 1) {
                    historyIndex[id]++;
                    activeInput.value = inputHistory[id][historyIndex[id]];
                }
            } else {
                // Undo
                if (historyIndex[id] > 0) {
                    historyIndex[id]--;
                    activeInput.value = inputHistory[id][historyIndex[id]];
                }
            }
        }
    }
}