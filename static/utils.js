/**
 * 将字符串编码为安全的 Base64，可用于创建有效的 HTML ID。
 * @param {string} str - 需要编码的字符串。
 * @returns {string} - Base64 编码后的安全字符串。
 */
export function toSafeBase64(str) {
    // btoa 无法处理非 ASCII 字符，所以需要先进行 UTF-8 编码
    let encoded = btoa(unescape(encodeURIComponent(str)));
    // 替换特殊字符以确保作为 HTML ID 的有效性
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 将安全的 Base64 字符串解码回原始字符串。
 * @param {string} base64 - Base64 编码后的字符串。
 * @returns {string} - 解码后的原始字符串。
 */
export function fromSafeBase64(base64) {
    return decodeURIComponent(escape(atob(base64.replace(/-/g, '+').replace(/_/g, '/'))));
}

/**
 * Initializes input history
 * @param {Array<HTMLElement>} inputs - An array of form input elements
 */
export function initializeInputHistory(inputs) {
    const history = {};
    const index = {};
    inputs.forEach(input => {
        if (input) {
            history[input.id] = [input.value];
            index[input.id] = 0;
        }
    });
    return { inputHistory: history, historyIndex: index };
}

/**
 * Records input history
 * @param {Event} event - The input event
 * @param {Object} history - The history object
 * @param {Object} index - The history index object
 */
export function recordHistory(event, history, index) {
    const input = event.target;
    const id = input.id;
    const value = input.value;
    const currentHistory = history[id];
    const currentIndex = index[id];

    if (currentHistory && currentHistory[currentIndex] !== value) {
        // If the current index is not at the end, truncate the history from the current index
        if (currentIndex < currentHistory.length - 1) {
            currentHistory.splice(currentIndex + 1);
        }
        currentHistory.push(value);
        index[id] = currentHistory.length - 1;
    }
}

/**
 * Handles undo and redo
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Array<HTMLElement>} inputs - An array of form input elements
 * @param {Object} history - The history object
 * @param {Object} index - The history index object
 */
export function handleUndoRedo(event, inputs, history, index) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    if (isCtrlOrCmd && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        const activeElement = document.activeElement;
        const id = activeElement.id;
        const currentHistory = history[id];
        const currentIndex = index[id];

        if (currentHistory && currentIndex > 0) {
            const newIndex = currentIndex - 1;
            activeElement.value = currentHistory[newIndex];
            index[id] = newIndex;
        }
    } else if (isCtrlOrCmd && event.key === 'y') {
        event.preventDefault();
        const activeElement = document.activeElement;
        const id = activeElement.id;
        const currentHistory = history[id];
        const currentIndex = index[id];

        if (currentHistory && currentIndex < currentHistory.length - 1) {
            const newIndex = currentIndex + 1;
            activeElement.value = currentHistory[newIndex];
            index[id] = newIndex;
        }
    }
}
