// 表单处理和验证

/**
 * Validates and processes form data.
 * @param {HTMLFormElement} form - The form element.
 * @param {boolean} isEditing - Whether we're editing an existing entry.
 * @param {string} oldLemma - The original lemma before editing.
 * @param {Object} dictionaryData - The dictionary data.
 * @returns {Object} The processed form data.
 */
export function processFormData(form, isEditing, oldLemma, dictionaryData) {
    const formData = new FormData(form);
    const lemma = isEditing ?
        form.querySelector('#form-lemma').value.trim() :
        (formData.get('lemma') || '').trim();

    if (!lemma) {
        throw new Error('词条 (Lemma) 不能为空！');
    }

    const explanation = (formData.get('explanation') || '').trim();
    if (explanation.includes(';')) {
        throw new Error('解释字段不能包含分号，一个词条只能有一个解释。');
    }

    // 删除旧条目（如果 lemma 被修改了）
    if (isEditing && oldLemma && oldLemma !== lemma) {
        delete dictionaryData[oldLemma];
    }

    return {
        lemma: lemma,
        entry: {
            'Type': (formData.get('type') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
            'Meaning': (formData.get('meaning') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
            'From': (formData.get('from') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
            'Explanation': [explanation],
            'To': (formData.get('to') || '').split(';').map(s => s.trim()).filter(s => s !== ''),
        }
    };
}

/**
 * Fills the form with entry data.
 * @param {HTMLFormElement} form - The form element.
 * @param {string} word - The word to edit.
 * @param {Object} dictionaryData - The dictionary data.
 */
export function fillFormWithEntryData(form, word, dictionaryData) {
    const entry = dictionaryData[word];
    form.querySelector('#form-lemma').value = word;
    form.querySelector('#form-lemma').disabled = false;
    form.querySelector('#form-type').value = (entry.Type || []).join('; ');
    form.querySelector('#form-meaning').value = (entry.Meaning || []).join('; ');
    form.querySelector('#form-from').value = (entry.From || []).join('; ');
    form.querySelector('#form-explanation').value = (entry.Explanation || []).join('; ');
    form.querySelector('#form-to').value = (entry.To || []).join('; ');
}

/**
 * Resets the form to its initial state.
 * @param {HTMLFormElement} form - The form element.
 */
export function resetForm(form) {
    form.reset();
    form.querySelector('#form-lemma').disabled = false;
}
