// 应用主入口和全局状态管理
import { fetchDictionaryData, saveEntry, deleteEntry } from './api.js';
import { buildTreeData, collectPopularTags } from './data.js';
import {
    showTooltip, hideTooltip, createListItem, renderTagButtons,
    renderTree, showToast
} from './ui.js';
import { initializeInputHistory, recordHistory, handleUndoRedo } from './utils.js';
import { processFormData, fillFormWithEntryData, resetForm } from './form-handler.js';
import { setupSearch } from './search.js';
// 引入新的文档处理模块
import { openDocumentation } from './docs.js';

// 全局变量来存储词典数据和状态
let allDictionaryData = {};
let initialEntry = '';
let popularTags = { Type: {}, From: {} };
let treeData = {};
let docHeadingsMap = {}; // 用于存储从 docs.md 解析出的标题和释义

// 用于实现撤销/重做功能
let inputHistory = {};
let historyIndex = {};

// 获取所有 DOM 元素
const entryDisplay = document.getElementById('entry-display');
const entryTitle = document.getElementById('entry-title');
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
// 获取新的文档按钮
const docButton = document.getElementById('doc-button');

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

const formInputs = [formLemma, formType, formMeaning, formFrom, formExplanation, formTo];
let activeEntryElement = null;

// 声明全局变量来存储标签容器
let typeTagsContainer;
let fromTagsContainer;

/**
 * 获取并解析 docs.md 文件，构建一个映射。
 * 映射的键是纯文本关键字 (如 'v')，值是一个包含原始标题和释义的对象。
 * 例如：'### 动词 v' -> 'v': { original: '动词 v', definition: '动词' }
 */
async function loadDocHeadingsMap() {
    try {
        const response = await fetch('/static/docs.md');
        if (!response.ok) {
            console.error('Failed to load docs.md for heading mapping.');
            return;
        }
        const markdown = await response.text();
        const headingsRegex = /^(?:###|####) (.*)/gm;
        let match;
        while ((match = headingsRegex.exec(markdown)) !== null) {
            const originalHeading = match[1].trim(); // 例: "动词 v" 或 "memper<w>"

            // 解析释义和关键字
            const parts = originalHeading.split(' ');
            const keywordWithTags = parts.pop() || ''; // 最后一部分是关键字
            const definition = parts.join(' ').trim(); // 剩下的是释义

            const cleanKeyword = keywordWithTags.replace(/<w>/g, '').trim(); // 例: "v" 或 "memper"

            if (cleanKeyword) {
                docHeadingsMap[cleanKeyword] = {
                    original: originalHeading,
                    definition: definition || null // 如果没有释义部分，则为 null
                };
            }
        }
    } catch (error) {
        console.error('Error loading or parsing docs.md:', error);
    }
}

/**
 * 为词条详情页上的链接设置点击和悬停事件。
 * 匹配文档标题的项目会变成绿色链接，并增加鼠标悬停显示释义的浮动提示框。
 */
function setupDocumentationLinks(headingsMap) {
    const linkLists = [lists['Type'], lists['From']];

    linkLists.forEach(list => {
        if (!list) return;

        list.querySelectorAll('li').forEach(item => {
            const itemText = item.textContent.trim();

            if (headingsMap.hasOwnProperty(itemText)) {
                const docInfo = headingsMap[itemText];

                // 设置样式和点击事件
                item.style.color = 'green';
                item.style.cursor = 'pointer';

                item.addEventListener('click', (event) => {
                    event.stopPropagation();
                    // 使用原始标题（包含释义和<w>标签）来确保链接正确
                    openDocumentation(docInfo.original);
                });

                // 添加悬停事件来显示释义
                if (docInfo.definition) {
                    item.addEventListener('mouseenter', (event) => {
                        showTooltip(docInfo.definition, event.clientX, event.clientY);
                    });
                    item.addEventListener('mouseleave', () => {
                        hideTooltip();
                    });
                }
            }
        });
    });
}


/**
 * Renders the entry details based on the dictionary data.
 * @param {string} word - The entry to display.
 */
export function displayEntry(word) {
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
                data.forEach(item => lists[key].appendChild(createListItem(item, true, allDictionaryData)));
                anySectionDisplayed = true;
            }
        } else {
            if (data && data.length > 0 && data[0] !== '0' && data[0] !== '') {
                sections[key].style.display = 'block';
                data.forEach(item => lists[key].appendChild(createListItem(item, key === 'From' || key === 'To', allDictionaryData)));
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

    setupDocumentationLinks(docHeadingsMap);
}

/**
 * Reloads the tree-structured entry list.
 */
function loadEntryList() {
    entryListElement.innerHTML = '';
    const { treeData: newTreeData, rootNodes } = buildTreeData(allDictionaryData);
    treeData = newTreeData;
    renderTree(entryListElement, rootNodes, treeData, allDictionaryData);
}

// 事件监听器
addButton.addEventListener('click', () => {
    resetForm(editForm);
    const { inputHistory: newInputHistory, historyIndex: newHistoryIndex } = initializeInputHistory(formInputs);
    inputHistory = newInputHistory;
    historyIndex = newHistoryIndex;

    renderTagButtons(typeTagsContainer, formType, popularTags.Type);
    renderTagButtons(fromTagsContainer, formFrom, popularTags.From);
    editModal.style.display = 'flex';
});

docButton.addEventListener('click', () => {
    openDocumentation();
});


let currentEditingLemma = null;


editButton.addEventListener('click', () => {
    if (activeEntryElement) {
        const word = activeEntryElement.getAttribute('data-word');
        currentEditingLemma = word;
        fillFormWithEntryData(editForm, word, allDictionaryData);
        const { inputHistory: newInputHistory, historyIndex: newHistoryIndex } = initializeInputHistory(formInputs);
        inputHistory = newInputHistory;
        historyIndex = newHistoryIndex;
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
            const result = await deleteEntry(word);

            if (result.success) {
                showToast('词条删除成功！');
                delete allDictionaryData[word];
                popularTags = collectPopularTags(allDictionaryData);
                loadEntryList();
                displayEntry(null);
            } else {
                alert('删除失败: ' + result.message);
            }
        } catch (error) {
            alert(`删除时发生错误: ${error.message}`);
        }
    }
});

closeModal.addEventListener('click', () => {
    editModal.style.display = 'none';
});

cancelButton.addEventListener('click', () => {
    editModal.style.display = 'none';
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        editModal.style.display = 'none';
    }
});

editModal.addEventListener('keydown', (event) => {
    handleUndoRedo(event, formInputs, inputHistory, historyIndex);
});

formInputs.forEach(input => {
    input.addEventListener('input', (e) => {
        recordHistory(e, inputHistory, historyIndex);
    });
});

formExplanation.addEventListener('input', (event) => {
    if (event.target.value.includes(';')) {
        event.target.value = event.target.value.replace(/;/g, '');
        alert('解释字段不能包含分号，一个词条只能有一个解释。');
    }
});

editForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        const isEditing = !!currentEditingLemma;
        const formData = processFormData(editForm, isEditing, currentEditingLemma, allDictionaryData);

        const result = await saveEntry(formData);

        if (result.success) {
            showToast('词条保存成功！');
            editModal.style.display = 'none';
            allDictionaryData[formData.lemma] = formData.entry;
            popularTags = collectPopularTags(allDictionaryData);
            loadEntryList();
            displayEntry(formData.lemma);

            currentEditingLemma = null;
        } else {
            alert('保存失败: ' + result.message);
        }
    } catch (error) {
        alert(error.message);
    }
});

window.addEventListener('popstate', (event) => {
    const word = event.state ? event.state.word : initialEntry;
    displayEntry(word);
});

window.addEventListener('entryClick', (event) => {
    displayEntry(event.detail);
});

window.addEventListener('beforeunload', () => {
    navigator.sendBeacon('/save_on_exit', '');
});

document.addEventListener('DOMContentLoaded', async () => {
    const formType = document.getElementById('form-type');
    const formFrom = document.getElementById('form-from');

    typeTagsContainer = document.createElement('div');
    typeTagsContainer.classList.add('tag-container');
    formType.insertAdjacentElement('afterend', typeTagsContainer);

    fromTagsContainer = document.createElement('div');
    fromTagsContainer.classList.add('tag-container');
    formFrom.insertAdjacentElement('afterend', fromTagsContainer);

    const [{ data, initialEntry: initial }] = await Promise.all([
        fetchDictionaryData(),
        loadDocHeadingsMap() // 加载文档标题
    ]);

    allDictionaryData = data;
    initialEntry = initial;
    popularTags = collectPopularTags(allDictionaryData);

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
            noDataMessage.textContent = '词典数据为空，请使用"新增词条"按钮添加第一个词条。';
        }
    }

    setupSearch(allDictionaryData, displayEntry);
});
