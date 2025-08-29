// 用户界面相关函数

// 创建并处理浮动提示框
const tooltip = document.createElement('div');
tooltip.style.cssText = `
    position: fixed;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    border-radius: 6px;
    z-index: 9999;
    font-size: 14px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;
document.body.appendChild(tooltip);

/**
 * Displays the tooltip.
 * @param {string} text - The text to display.
 * @param {number} x - The x-coordinate of the mouse.
 * @param {number} y - The y-coordinate of the mouse.
 */
export function showTooltip(text, x, y) {
    tooltip.textContent = text;
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y + 15}px`;
    tooltip.style.opacity = 1;
}

/**
 * Hides the tooltip.
 */
export function hideTooltip() {
    tooltip.style.opacity = 0;
}

/**
 * Creates a list item, with a link if needed.
 * @param {string} text - The text to display.
 * @param {boolean} isLink - Whether to create a clickable link.
 * @param {Object} dictionaryData - The dictionary data.
 * @returns {HTMLLIElement} The created list item.
 */
export function createListItem(text, isLink = false, dictionaryData) {
    const li = document.createElement('li');
    if (isLink) {
        if (dictionaryData[text]) {
            const a = document.createElement('a');
            a.href = `#${text}`;
            a.textContent = text;
            a.classList.add('related-link');

            a.addEventListener('click', (event) => {
                event.preventDefault();
                // This will be handled by the main module
                window.dispatchEvent(new CustomEvent('entryClick', { detail: text }));
            });

            a.addEventListener('mouseenter', (event) => {
                const entryData = dictionaryData[text];
                if (entryData && entryData.Meaning && entryData.Meaning.length > 0) {
                    showTooltip(entryData.Meaning[0], event.clientX, event.clientY);
                }
            });

            a.addEventListener('mouseleave', () => {
                hideTooltip();
            });

            li.appendChild(a);
        } else {
            li.textContent = text;
        }
    } else {
        li.textContent = text;
    }
    return li;
}

/**
 * Renders the popular tag buttons.
 * @param {HTMLElement} container - The button container.
 * @param {HTMLInputElement} inputField - The corresponding input field.
 * @param {Object} tags - The tag data.
 */
export function renderTagButtons(container, inputField, tags) {
    container.innerHTML = '';
    const sortedTags = Object.entries(tags).sort(([, a], [, b]) => b - a).slice(0, 10);

    sortedTags.forEach(([tag, count]) => {
        const button = document.createElement('button');
        button.textContent = `${tag}`;
        button.classList.add('tag-button');
        button.type = 'button';
        button.addEventListener('click', () => {
            const currentValue = inputField.value.trim();
            const tagsArray = currentValue === '' ? [] : currentValue.split(';').map(s => s.trim());
            if (!tagsArray.includes(tag)) {
                inputField.value = tagsArray.length === 0 ? tag : `${currentValue.trim()}; ${tag}`;
            }
        });
        container.appendChild(button);
    });
}

/**
 * Recursively renders the tree list.
 * @param {HTMLElement} parentElement - The parent ul element.
 * @param {string[]} nodes - The array of entries to render.
 * @param {Object} treeData - The tree structure data.
 * @param {Object} dictionaryData - The dictionary data.
 */
export function renderTree(parentElement, nodes, treeData, dictionaryData) {
    nodes.forEach(word => {
        const hasChildren = treeData[word] && treeData[word].length > 0;
        const li = document.createElement('li');

        const entryItem = document.createElement('div');
        entryItem.classList.add('entry-item');
        entryItem.setAttribute('data-word', word);

        if (hasChildren) {
            const toggleIcon = document.createElement('span');
            toggleIcon.classList.add('toggle-icon');
            toggleIcon.textContent = '>';
            entryItem.appendChild(toggleIcon);

            toggleIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleIcon.classList.toggle('rotated');
                const childList = li.querySelector('.child-list');
                if (childList) {
                    childList.classList.toggle('open');
                }
            });
        }

        const wordSpan = document.createElement('span');
        wordSpan.textContent = word;
        entryItem.appendChild(wordSpan);

        entryItem.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('entryClick', { detail: word }));
        });

        entryItem.addEventListener('mouseenter', (event) => {
            const entryData = dictionaryData[word];
            if (entryData && entryData.Meaning && entryData.Meaning.length > 0) {
                showTooltip(entryData.Meaning[0], event.clientX, event.clientY);
            }
        });

        entryItem.addEventListener('mouseleave', () => {
            hideTooltip();
        });

        li.appendChild(entryItem);

        if (hasChildren) {
            const childList = document.createElement('ul');
            childList.classList.add('child-list');
            renderTree(childList, treeData[word], treeData, dictionaryData);
            li.appendChild(childList);
        }

        parentElement.appendChild(li);
    });
}

/**
 * Displays a toast message at the bottom right.
 * @param {string} message - The message to display.
 */
export function showToast(message) {
    // Check if toast element already exists
    let toast = document.getElementById('toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.classList.add('toast');
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}