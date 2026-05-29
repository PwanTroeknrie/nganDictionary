// 数据处理和树结构构建函数

/**
 * Builds the tree data structure (both parent → children and child → parents).
 * @param {Object} dictionaryData - The dictionary data.
 * @returns {Object} The tree data, reverse tree data, and root nodes.
 */
export function buildTreeData(dictionaryData) {
    const treeData = {};         // parent -> children
    const reverseTreeData = {};  // child -> parents
    const hasParent = new Set();

    for (const lemma in dictionaryData) {
        const entry = dictionaryData[lemma];
        if (entry.From) {
            entry.From.forEach(fromWord => {
                // 确保 fromWord 存在于词典中，避免链接到不存在的词条
                if (dictionaryData[fromWord]) {
                    if (!treeData[fromWord]) {
                        treeData[fromWord] = [];
                    }
                    if (!treeData[fromWord].includes(lemma)) {
                        treeData[fromWord].push(lemma);
                    }

                    if (!reverseTreeData[lemma]) {
                        reverseTreeData[lemma] = [];
                    }
                    if (!reverseTreeData[lemma].includes(fromWord)) {
                        reverseTreeData[lemma].push(fromWord);
                    }

                    hasParent.add(lemma);
                }
            });
        }
    }

    const rootNodes = Object.keys(dictionaryData).filter(lemma => !hasParent.has(lemma)).sort();

    function sortTree(nodes) {
        nodes.sort((a, b) => a.localeCompare(b));
        nodes.forEach(node => {
            if (treeData[node]) {
                sortTree(treeData[node]);
            }
        });
    }

    sortTree(rootNodes);
    return { treeData, reverseTreeData, rootNodes };
}

/**
 * Collects popular tags from the dictionary data.
 * @param {Object} dictionaryData - The dictionary data.
 * @returns {Object} Popular tags organized by type.
 */
export function collectPopularTags(dictionaryData) {
    const popularTags = { Type: {}, From: {} };

    for (const lemma in dictionaryData) {
        const entry = dictionaryData[lemma];
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

    return popularTags;
}
