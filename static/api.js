// 所有与后端API交互的函数

/**
 * Fetches dictionary data from the backend.
 * @returns {Promise<Object>} The dictionary data.
 */
// api.js

/**
 * Fetches dictionary data from the backend.
 * @returns {Promise<Object>} The dictionary data.
 */
export async function fetchDictionaryData() {
    try {
        // 添加一个时间戳作为查询参数，以防止浏览器使用缓存
        const timestamp = new Date().getTime();
        const response = await fetch(`/get_data?t=${timestamp}`);

        if (!response.ok) {
            throw new Error('Network request failed');
        }
        const data = await response.json();
        return {
            data: data.data,
            initialEntry: data.initialEntry
        };
    } catch (error) {
        console.error('Error fetching dictionary data:', error);
        return { data: {}, initialEntry: null };
    }
}

/**
 * Saves an entry to the backend.
 * @param {Object} entryData - The entry data to save.
 * @returns {Promise<Object>} The server response.
 */
export async function saveEntry(entryData) {
    try {
        const response = await fetch('/save_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Save failed: ${error.message}`);
    }
}

/**
 * Deletes an entry from the backend.
 * @param {string} lemma - The lemma to delete.
 * @returns {Promise<Object>} The server response.
 */
export async function deleteEntry(lemma) {
    try {
        const response = await fetch('/delete_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lemma: lemma })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
}