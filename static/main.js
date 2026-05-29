// main.js - 应用主入口（已移除文档解析逻辑，改为引用 docs.js 导出的函数）
import { fetchDictionaryData, saveEntry, deleteEntry } from './api.js';
import { buildTreeData, collectPopularTags } from './data.js';
import {
    showTooltip, hideTooltip, createListItem, renderTagButtons,
    renderTree, showToast
} from './ui.js';
import { initializeInputHistory, recordHistory, handleUndoRedo } from './utils.js';
import { processFormData, fillFormWithEntryData, resetForm } from './form-handler.js';
import { setupSearch } from './search.js';
import { openDocumentation, loadDocHeadingsMap, setupDocumentationLinks } from './docs.js';

// 全局状态
let allDictionaryData = {};
let initialEntry = '';
let popularTags = { Type: {}, From: {} };
let treeData = {};
let reverseTreeData = {};
let docHeadingsMap = {};

let inputHistory = {};
let historyIndex = {};

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
const docButton = document.getElementById('doc-button');

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
let typeTagsContainer;
let fromTagsContainer;

export function displayEntry(word) {
    const entry = allDictionaryData[word];
    const noDataMessage = document.getElementById('no-data-message');

    if (!word || !entry) {
        entryTitle.textContent = '请选择一个词条';
        for (const key in lists) {
            lists[key].innerHTML = '';
            sections[key].style.display = 'none';
        }
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
            noDataMessage.textContent = '词条未找到或已被删除。';
        }
        entryDisplay.style.display = 'none';
        editButton.disabled = true;
        deleteButton.disabled = true;
        if (activeEntryElement) {
            activeEntryElement.classList.remove('active');
            activeEntryElement = null;
        }
        return;
    }

    if (activeEntryElement) activeEntryElement.classList.remove('active');

    const newActiveElement = document.querySelector(`.entry-item[data-word="${word}"]`);
    if (newActiveElement) {
        newActiveElement.classList.add('active');
        activeEntryElement = newActiveElement;
        newActiveElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        editButton.disabled = false;
        deleteButton.disabled = false;
    } else {
        editButton.disabled = true;
        deleteButton.disabled = true;
    }

    // 自动展开父级
    let currentWord = word;
    while (reverseTreeData[currentWord] && reverseTreeData[currentWord].length > 0) {
        const parentWord = reverseTreeData[currentWord][0];
        const parentElement = document.querySelector(`.entry-item[data-word="${parentWord}"]`);
        if (parentElement && !parentElement.classList.contains('expanded')) {
            parentElement.classList.add('expanded');
            const childList = parentElement.nextElementSibling;
            if (childList) childList.classList.add('open');
        }
        currentWord = parentWord;
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
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
            noDataMessage.textContent = '此词条没有详细信息，请使用新增/编辑功能添加内容。';
        }
    } else {
        if (noDataMessage) noDataMessage.style.display = 'none';
    }

    setTimeout(() => {
        entryDisplay.classList.add('visible');
    }, 50);

    // 根据已加载的文档映射来增强链接（如果有）
    setupDocumentationLinks(docHeadingsMap);
}

function loadEntryList() {
    entryListElement.innerHTML = '';
    const { treeData: newTreeData, reverseTreeData: newReverseTreeData, rootNodes } = buildTreeData(allDictionaryData);
    treeData = newTreeData;
    reverseTreeData = newReverseTreeData;
    renderTree(entryListElement, rootNodes, treeData, allDictionaryData);
}

// 事件绑定
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
    if (!input) return;
    input.addEventListener('input', (e) => {
        recordHistory(e, inputHistory, historyIndex);
    });
});

if (formExplanation) {
    formExplanation.addEventListener('input', (event) => {
        if (event.target.value.includes(';')) {
            event.target.value = event.target.value.replace(/;/g, '');
            alert('解释字段不能包含分号，一个词条只能有一个解释。');
        }
    });
}

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

// 初始化：先并行加载 字典数据 和 docs 映射，再继续 UI 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 在表单后面插入 tag 容器
    typeTagsContainer = document.createElement('div');
    typeTagsContainer.classList.add('tag-container');
    if (formType) formType.insertAdjacentElement('afterend', typeTagsContainer);

    fromTagsContainer = document.createElement('div');
    fromTagsContainer.classList.add('tag-container');
    if (formFrom) formFrom.insertAdjacentElement('afterend', fromTagsContainer);

    try {
        // 并行加载字典数据和文档映射
        const [dictResp, headingsMap] = await Promise.all([
            fetchDictionaryData(),
            loadDocHeadingsMap()
        ]);

        // fetchDictionaryData 期望返回 { data, initialEntry: '...' }
        allDictionaryData = dictResp.data || {};
        initialEntry = dictResp.initialEntry || '';
        popularTags = collectPopularTags(allDictionaryData);

        // docs 映射
        docHeadingsMap = headingsMap || {};

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

        // 初始化搜索（放在加载数据之后）
        setupSearch(allDictionaryData, displayEntry);
    } catch (err) {
        console.error('初始化时发生错误：', err);
        alert('初始化失败，请在控制台查看错误详情。');
    }
});
