// 全局变量来存储词典数据和初始词条
let allDictionaryData = {};
let initialEntry = '';
let popularTags = {
    Type: {},
    From: {}
};
// 声明全局变量来存储标签容器
let typeTagsContainer;
let fromTagsContainer;

// 获取所有 DOM 元素
const entryDisplay = document.getElementById('entry-display');
const entryTitle = document.getElementById('entry-title');

// 获取所有词条信息区域的容器和列表
const sections = {
    'Type': document.getElementById('type-section'),
    'Meaning': document.getElementById('meaning-section'),
    'From': document.getElementById('from-section'),
    'Explanation': document.getElementById('explanation-section'),
    'To': document.getElementById('to-section')
};
const lists = {
    'Type': document.getElementById('type-list'),
    'Meaning': document.getElementById('meaning-list'),
    'From': document.getElementById('from-list'),
    'Explanation': document.getElementById('explanation-list'),
    'To': document.getElementById('to-list')
};

const entryListElement = document.getElementById('entry-list');
const addButton = document.getElementById('add-button');
const editButton = document.getElementById('edit-button');
const deleteButton = document.getElementById('delete-button');
const editModal = document.getElementById('edit-modal');
const closeModal = document.querySelector('.close-button');
const cancelButton = document.getElementById('cancel-button');
const editForm = document.getElementById('edit-form');
const formLemma = document.getElementById('form-lemma');
const formType = document.getElementById('form-type');
const formMeaning = document.getElementById('form-meaning');
const formFrom = document.getElementById('form-from');
const formExplanation = document.getElementById('form-explanation');
const formTo = document.getElementById('form-to');

let activeEntryElement = null;
let treeData = {};

// 用于实现撤销/重做功能
let inputHistory = {};
let historyIndex = {};
const formInputs = [formLemma, formType, formMeaning, formFrom, formExplanation, formTo];

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
function showTooltip(text, x, y) {
    tooltip.textContent = text;
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y + 15}px`;
    tooltip.style.opacity = 1;
}

/**
 * Hides the tooltip.
 */
function hideTooltip() {
    tooltip.style.opacity = 0;
}


/**
 * Creates a list item, with a link if needed.
 * @param {string} text - The text to display.
 * @param {boolean} isLink - Whether to create a clickable link.
 * @returns {HTMLLIElement}
 */
function createListItem(text, isLink = false) {
    const li = document.createElement('li');
    if (isLink) {
        if (allDictionaryData[text]) {
            const a = document.createElement('a');
            a.href = `#${text}`;
            a.textContent = text;
            a.classList.add('related-link');

            a.addEventListener('click', (event) => {
                event.preventDefault();
                displayEntry(text);
            });
            a.addEventListener('mouseenter', (event) => {
                const entryData = allDictionaryData[text];
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
 * Renders the entry details based on the dictionary data.
 * @param {string} word - The entry to display.
 */
function displayEntry(word) {
    const entry = allDictionaryData[word];
    const noDataMessage = document.getElementById('no-data-message');

    if (!word || !entry) {
        entryTitle.textContent = '请选择一个词条';
        for (const key in lists) {
            lists[key].innerHTML = '';
            sections[key].style.display = 'none';
        }
        noDataMessage.style.display = 'block';
        noDataMessage.textContent = '词条未找到或已被删除。';
        entryDisplay.style.display = 'none';
        editButton.disabled = true;
        deleteButton.disabled = true;
        if (activeEntryElement) {
            activeEntryElement.classList.remove('active');
            activeEntryElement = null;
        }
        return;
    }

    if (activeEntryElement) {
        activeEntryElement.classList.remove('active');
    }
    const newActiveElement = document.querySelector(`.entry-item[data-word="${word}"]`);
    if (newActiveElement) {
        newActiveElement.classList.add('active');
        activeEntryElement = newActiveElement;
        editButton.disabled = false;
        deleteButton.disabled = false;
    } else {
        editButton.disabled = true;
        deleteButton.disabled = true;
    }

    const url = `/entry/${word}`;
    window.history.pushState({ word: word }, '', url);

    entryTitle.textContent = word;
    entryDisplay.style.display = 'block';

    let anySectionDisplayed = false;
    for (const key in lists) {
        lists[key].innerHTML = '';
        const data = entry[key];

        if (key === 'To') {
            const hasToData = data && data.length > 0 && !(data.length === 1 && (data[0] === '0' || data[0] === ''));
            sections[key].style.display = hasToData ? 'block' : 'none';
            if (hasToData) {
                data.forEach(item => lists[key].appendChild(createListItem(item, true)));
                anySectionDisplayed = true;
            }
        } else {
            if (data && data.length > 0 && data[0] !== '0' && data[0] !== '') {
                sections[key].style.display = 'block';
                data.forEach(item => lists[key].appendChild(createListItem(item, key === 'From' || key === 'To')));
                anySectionDisplayed = true;
            } else {
                sections[key].style.display = 'none';
            }
        }
    }

    if (!anySectionDisplayed) {
        noDataMessage.style.display = 'block';
        noDataMessage.textContent = '此词条没有详细信息，请使用新增/编辑功能添加内容。';
    } else {
        noDataMessage.style.display = 'none';
    }

    setTimeout(() => {
        entryDisplay.classList.add('visible');
    }, 50);
}

/**
 * Builds the tree data structure.
 */
function buildTreeData() {
    treeData = {};
    const hasParent = new Set();

    for (const lemma in allDictionaryData) {
        const entry = allDictionaryData[lemma];
        if (entry.From) {
            entry.From.forEach(fromWord => {
                if (fromWord in allDictionaryData) {
                    if (!treeData[fromWord]) {
                        treeData[fromWord] = [];
                    }
                    if (!treeData[fromWord].includes(lemma)) {
                        treeData[fromWord].push(lemma);
                    }
                    hasParent.add(lemma);
                }
            });
        }
    }

    const rootNodes = Object.keys(allDictionaryData).filter(lemma => !hasParent.has(lemma)).sort();

    function sortTree(nodes) {
        nodes.sort();
        nodes.forEach(node => {
            if (treeData[node]) {
                sortTree(treeData[node]);
            }
        });
    }

    sortTree(rootNodes);
    return rootNodes;
}

/**
 * Recursively renders the tree list.
 * @param {HTMLElement} parentElement - The parent ul element.
 * @param {string[]} nodes - The array of entries to render.
 */
function renderTree(parentElement, nodes) {
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

        entryItem.addEventListener('click', () => displayEntry(word));
        entryItem.addEventListener('mouseenter', (event) => {
            const entryData = allDictionaryData[word];
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
            renderTree(childList, treeData[word]);
            li.appendChild(childList);
        }

        parentElement.appendChild(li);
    });
}

/**
 * Reloads the tree-structured entry list.
 */
function loadEntryList() {
    entryListElement.innerHTML = '';
    const rootNodes = buildTreeData();
    renderTree(entryListElement, rootNodes);
}

/**
 * Fetches dictionary data from the backend.
 */
async function fetchDictionaryData() {
    try {
        const response = await fetch('/get_data');
        if (!response.ok) {
            throw new Error('Network request failed');
        }
        const data = await response.json();
        allDictionaryData = data.data;
        initialEntry = data.initialEntry;
    } catch (error) {
        console.error('Error fetching dictionary data:', error);
        allDictionaryData = {};
        initialEntry = null;
    }
}

/**
 * Displays a toast message at the bottom right.
 * @param {string} message - The message to display.
 */
function showToast(message) {
    const toast = document.getElementById('toast-message');
    if (!toast) {
        const toastDiv = document.createElement('div');
        toastDiv.id = 'toast-message';
        toastDiv.classList.add('toast');
        document.body.appendChild(toastDiv);
    }
    const toastElement = document.getElementById('toast-message');
    toastElement.textContent = message;
    toastElement.classList.add('show');
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

/**
 * Collects popular tags from the dictionary data.
 */
function collectPopularTags() {
    popularTags = { Type: {}, From: {} };
    for (const lemma in allDictionaryData) {
        const entry = allDictionaryData[lemma];
        if (entry.Type) {
            entry.Type.forEach(tag => {
                if (tag) popularTags.Type[tag] = (popularTags.Type[tag] || 0) + 1;
            });
        }
        if (entry.From) {
            entry.From.forEach(tag => {
                if (tag) popularTags.From[tag] = (popularTags.From[tag] || 0) + 1;
            });
        }
    }
}

/**
 * Renders the popular tag buttons.
 * @param {HTMLElement} container - The button container.
 * @param {HTMLInputElement} inputField - The corresponding input field.
 * @param {Object} tags - The tag data.
 */
function renderTagButtons(container, inputField, tags) {
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

function initializeInputHistory() {
    formInputs.forEach(input => {
        inputHistory[input.id] = [input.value];
        historyIndex[input.id] = 0;
    });
}

function recordHistory(e) {
    const input = e.target;
    const { id, value } = input;
    if (historyIndex[id] < inputHistory[id].length - 1) {
        inputHistory[id] = inputHistory[id].slice(0, historyIndex[id] + 1);
    }
    inputHistory[id].push(value);
    historyIndex[id] = inputHistory[id].length - 1;
}

addButton.addEventListener('click', () => {
    editForm.reset();
    formLemma.disabled = false;
    initializeInputHistory();
    renderTagButtons(typeTagsContainer, formType, popularTags.Type);
    renderTagButtons(fromTagsContainer, formFrom, popularTags.From);
    editModal.style.display = 'flex';
});

editButton.addEventListener('click', () => {
    if (activeEntryElement) {
        const word = activeEntryElement.getAttribute('data-word');
        const entry = allDictionaryData[word];
        formLemma.value = word;
        formLemma.disabled = true;
        formType.value = (entry.Type || []).join('; ');
        formMeaning.value = (entry.Meaning || []).join('; ');
        formFrom.value = (entry.From || []).join('; ');
        formExplanation.value = (entry.Explanation || []).join('; ');
        formTo.value = (entry.To || []).join('; ');
        initializeInputHistory();
    } else {
        alert('请先选择一个词条来编辑。');
        return;
    }
    renderTagButtons(typeTagsContainer, formType, popularTags.Type);
    renderTagButtons(fromTagsContainer, formFrom, popularTags.From);
    editModal.style.display = 'flex';
});

deleteButton.addEventListener('click', async () => {
    if (!activeEntryElement) {
        alert('请先选择一个要删除的词条。');
        return;
    }
    const word = activeEntryElement.getAttribute('data-word');

    if (confirm(`您确定要删除词条 "${word}" 吗？此操作无法撤销。`)) {
        try {
            const response = await fetch('/delete_entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lemma: word })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
            }

            const result = await response.json();
            if (result.success) {
                showToast('词条删除成功！');
                delete allDictionaryData[word];
                loadEntryList();
                displayEntry(null);
            } else {
                alert('删除失败: ' + result.message);
            }
        } catch (error) {
            alert(`删除时发生网络或服务器错误: ${error.message}`);
        }
    }
});

closeModal.addEventListener('click', () => {
    editModal.style.display = 'none';
});

cancelButton.addEventListener('click', () => {
    editModal.style.display = 'none';
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        editModal.style.display = 'none';
    }
});

editModal.addEventListener('keydown', (event) => {
    if (event.ctrlKey) {
        const activeInput = document.activeElement;
        if (!formInputs.includes(activeInput)) return;
        const { id } = activeInput;
        if (event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) {
                if (historyIndex[id] < inputHistory[id].length - 1) {
                    historyIndex[id]++;
                    activeInput.value = inputHistory[id][historyIndex[id]];
                }
            } else {
                if (historyIndex[id] > 0) {
                    historyIndex[id]--;
                    activeInput.value = inputHistory[id][historyIndex[id]];
                }
            }
        }
    }
});

formExplanation.addEventListener('input', (event) => {
    if (event.target.value.includes(';')) {
        event.target.value = event.target.value.replace(/;/g, '');
        alert('解释字段不能包含分号，一个词条只能有一个解释。');
    }
});

editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(editForm);
    const lemma = formLemma.disabled ? formLemma.value.trim() : (formData.get('lemma') || '').trim();

    if (!lemma) {
        alert('词条 (Lemma) 不能为空！');
        return;
    }

    const newEntry = {
        'Type': (formData.get('type') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
        'Meaning': (formData.get('meaning') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
        'From': (formData.get('from') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
        'Explanation': [(formData.get('explanation') || '').trim()],
        'To': (formData.get('to') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
    };

    const requestBody = { lemma: lemma, entry: newEntry };

    try {
        const response = await fetch('/save_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
        }

        const result = await response.json();

        if (result.success) {
            showToast('词条保存成功！');
            editModal.style.display = 'none';
            allDictionaryData[lemma] = newEntry;
            collectPopularTags();
            loadEntryList();
            displayEntry(lemma);
        } else {
            alert('保存失败: ' + result.message);
        }
    } catch (error) {
        alert(`保存时发生网络或服务器错误: ${error.message}`);
    }
});

window.addEventListener('popstate', (event) => {
    const word = event.state ? event.state.word : initialEntry;
    displayEntry(word);
});

document.addEventListener('DOMContentLoaded', async () => {
    await fetchDictionaryData();

    collectPopularTags();

    // --- 修改开始：确保推荐标签按钮的位置正确 ---
    typeTagsContainer = document.createElement('div');
    typeTagsContainer.classList.add('tag-container');
    // 将容器插入到 Type 输入框之后
    formType.insertAdjacentElement('afterend', typeTagsContainer);

    fromTagsContainer = document.createElement('div');
    fromTagsContainer.classList.add('tag-container');
    // 将容器插入到 From 输入框之后
    formFrom.insertAdjacentElement('afterend', fromTagsContainer);
    // --- 修改结束 ---

    formInputs.forEach(input => {
        input.addEventListener('input', recordHistory);
    });

    const style = document.createElement('style');
    style.textContent = `
        .toast { visibility: hidden; min-width: 250px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 16px; position: fixed; z-index: 10000; right: 30px; bottom: 30px; font-size: 16px; opacity: 0; transition: opacity 0.5s, visibility 0s 0.5s; }
        .toast.show { visibility: visible; opacity: 1; transition: opacity 0.5s; }
        .tag-container { display: flex; flex-wrap: wrap; gap: 5px; margin-top: -5px; margin-bottom: 15px; } /* 调整样式以适应新位置 */
        .tag-button { background-color: #e0e0e0; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 14px; transition: background-color 0.2s; }
        .tag-button:hover { background-color: #ccc; }
    `;
    document.head.appendChild(style);

    if (Object.keys(allDictionaryData).length > 0) {
        loadEntryList();
        const urlPath = window.location.pathname;
        const parts = urlPath.split('/');
        const wordFromUrl = decodeURIComponent(parts[parts.length - 1]);

        if (allDictionaryData[wordFromUrl] && urlPath.startsWith('/entry/')) {
            displayEntry(wordFromUrl);
        } else {
            displayEntry(initialEntry);
        }
    } else {
        entryDisplay.style.display = 'none';
        editButton.disabled = true;
        deleteButton.disabled = true;
        const noDataMessage = document.getElementById('no-data-message');
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
            noDataMessage.textContent = '词典数据为空，请使用“新增词条”按钮添加第一个词条。';
        }
    }
});
