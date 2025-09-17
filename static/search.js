// search.js

let allDictionaryData = {};
let searchInput;
let searchResultsList;
let displayEntryFunc; // 新增变量来存储传递进来的函数

/**
 * Initializes the search functionality.
 * @param {Object} dictionaryData - The dictionary data.
 * @param {Function} displayEntryFunc - The function to display an entry.
 */
export function setupSearch(dictionaryData, func) {
    allDictionaryData = dictionaryData;
    displayEntryFunc = func;
    searchInput = document.getElementById('search-input');
    searchResultsList = document.getElementById('search-results-list');

    searchInput.addEventListener('input', () => {
        handleSearch(searchInput.value.trim());
    });

    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !searchResultsList.contains(event.target)) {
            searchResultsList.style.display = 'none';
        }
    });

    // 为 searchResultsList 添加事件代理
    searchResultsList.addEventListener('click', (event) => {
        const clickedItem = event.target.closest('li');
        if (clickedItem) {
            const lemma = clickedItem.getAttribute('data-lemma');
            if (lemma) {
                displayEntryFunc(lemma);
                searchInput.value = lemma;
                searchResultsList.style.display = 'none';
            }
        }
    });
}

/**
 * Executes the search and updates the results list.
 * @param {string} query - The search query.
 */
function handleSearch(query) {
    if (query.length < 1) {
        searchResultsList.style.display = 'none';
        return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const results = [];

    // 遍历所有词条进行搜索
    for (const lemma in allDictionaryData) {
        const entry = allDictionaryData[lemma];

        // 检查词条名称本身
        if (lemma.toLowerCase().includes(lowerCaseQuery)) {
            results.push({
                lemma: lemma,
                matchType: 'lemma',
                preview: entry.Meaning ? entry.Meaning.join(', ') : '无含义'
            });
            continue;
        }

        // 检查含义
        if (entry.Meaning && entry.Meaning.some(m => m.toLowerCase().includes(lowerCaseQuery))) {
            results.push({
                lemma: lemma,
                matchType: 'meaning',
                preview: entry.Meaning.join(', ')
            });
        }
    }

    renderSearchResults(results.slice(0, 10)); // 只显示前10个结果
}

/**
 * Renders the search results in the dropdown list.
 * @param {Array} results - The search results to display.
 */
function renderSearchResults(results) {
    searchResultsList.innerHTML = '';

    if (results.length === 0) {
        searchResultsList.style.display = 'none';
        return;
    }

    results.forEach(result => {
        const li = document.createElement('li');
        li.setAttribute('data-lemma', result.lemma);
        li.innerHTML = `<strong>${result.lemma}</strong> <br/> ${result.preview}`;
        searchResultsList.appendChild(li);
    });

    searchResultsList.style.display = 'block';
}
