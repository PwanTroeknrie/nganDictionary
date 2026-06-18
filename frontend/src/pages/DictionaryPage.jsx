import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';

// 瀵煎叆鎵€鏈夊瓙缁勪欢
import Header from '../components/Header.jsx';
import WordList, { buildTreeData, flattenTree } from '../components/WordList';
import EntryEditor from '../components/EntryEditor';
import HierarchyTree from '../components/HierarchyTree';

// 瀵煎叆鎵€鏈塇ook鍑芥暟
import { useShortcuts } from '../hooks/useShortcuts';
import { wordToSlug } from '../lib/slugUtils.js';
import { getAuthHeaders, getStoredAuthLevel, projectStore, useProjectStore } from '../store/projectStore.js';

// 瀹氫箟 API 鐨勫熀纭€ URL
const API_BASE_URL = '/api/projects';

/**
 * 璇嶅吀椤甸潰缁勪欢
 * @param {object} props
 * @param {string} props.projectId - 褰撳墠閫夊畾鐨勯」鐩甀D
 * (鍏朵粬 props 鐣?
 */
function DictionaryPage({ isDarkMode, toggleTheme, customFont, setCustomFont }) {
    // --- URL 鍚屾 ---
    const { slug: urlSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // projectId from query param (?project=xxx) or fallback to 'default'
    const projectId = new URLSearchParams(location.search).get('project') || 'default';
    const authLevel = getStoredAuthLevel(projectId);
    const isReadOnly = !authLevel;  // guest = read-only
    const isGlobalEditMode = useProjectStore(s => s.isGlobalEditMode);
    const canEdit = Boolean(authLevel);

    // --- 鐘舵€佺鐞?---
    const [entries, setEntries] = useState([]);
    const [selectedEntrySlug, setSelectedEntrySlug] = useState(urlSlug || null);
    const [fetchError, setFetchError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [editingSection, setEditingSection] = useState(null);
    const [isWordListOpen, setIsWordListOpen] = useState(true);
    const [isTreeOpen, setIsTreeOpen] = useState(true);
    const [isFontInputVisible, setIsFontInputVisible] = useState(false);

    // 杩借釜鏈湴鏄惁鏈夋湭淇濆瓨鐨勪慨鏀?(浠呴拡瀵瑰綋鍓?selectedEntryId)
    const [hasLocalChanges, setHasLocalChanges] = useState(false);
    const [docHeadings, setDocHeadings] = useState([]);
    const [showNewEntryModal, setShowNewEntryModal] = useState(false);
    const [newEntryWord, setNewEntryWord] = useState('');
    const [newEntryTranslit, setNewEntryTranslit] = useState('');

    useEffect(() => {
        projectStore.setProject(projectId, authLevel);
    }, [projectId, authLevel]);

    // --- Ref 缁戝畾 ---
    const entryEditorRef = useRef(null);
    const lastModifiedEntryRef = useRef(null);
    // 淇濆瓨鏃剁敤鐨?slug锛圖B 涓綋鍓嶇殑 slug锛夛紝鍜屾樉绀虹敤鐨?selectedEntrySlug 瑙ｈ€?
    const savedSlugRef = useRef(null);

     // --- 閰嶇疆: 澶撮儴鎸夐挳鍙鎬ф帶鍒?(鎮ㄥ彲浠ヤ慨鏀硅繖浜涘€兼潵鎺у埗鎸夐挳鏄剧ず) ---
    const buttonVisibility = {
        homeNav: true,
        docNav: true,
        morphologyNav: true,
        wordlistToggle: true,
        fontInputToggle: true,
        editModeToggle: Boolean(authLevel),
        hierarchyTreeToggle: true,
        themeToggle: true,
    };

    // 鏍稿績鏁版嵁鑾峰彇鍑芥暟
    const fetchEntries = useCallback(async (selectFirst = true) => {
        if (!projectId) {
            setEntries([]);
            setSelectedEntrySlug(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setFetchError('');
        try {
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries`);
                if (response.ok) break;
                if (response.status === 404 && i === 0) {
                    await initSampleData(projectId);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setEntries(data);
            console.log(`[DictionaryPage] Loaded ${data.length} entries for project "${projectId}"`);

            if (data.length > 0 && selectFirst) {
                setSelectedEntrySlug(prev => {
                    if (!data.some(e => e.slug === prev)) {
                        return data[0].slug;
                    }
                    return prev;
                });
            } else if (data.length === 0) {
                setSelectedEntrySlug(null);
            }
        } catch (error) {
            console.error("[DictionaryPage] Failed to fetch entries:", error);
            setFetchError(`鍔犺浇澶辫触: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    // 鍒濆鍖栫ず渚嬫暟鎹?(鐢ㄤ簬棣栨鍔犺浇鎴栫┖椤圭洰)
    const initSampleData = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}/init-sample`, {
                method: 'POST',
                headers: getAuthHeaders(id)
            });
            if (!response.ok) {
                throw new Error('Failed to initialize sample data');
            }
            console.log('Sample data initialized successfully.');
        } catch (error) {
            console.error('Error during sample data initialization:', error);
        }
    };


    // --- useEffect: 褰?projectId 鍙樺寲鏃惰幏鍙栨暟鎹?---
    useEffect(() => {
        fetchEntries();
        fetch(`${API_BASE_URL}/${projectId}/docs/headings`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setDocHeadings(data.headings || []))
            .catch(() => setDocHeadings([]));
    }, [projectId, fetchEntries]);

    // 鑾峰彇閫変腑鐨勮瘝鏉″璞?(蹇呴』鍦ㄦ澹版槑锛屽悗缁?useEffect/handleEntryChange 渚濊禆瀹?
    const selectedEntry = useMemo(
        () => entries.find((e) => e.slug === selectedEntrySlug),
        [entries, selectedEntrySlug]
    );

    // 閫変腑璇嶆潯鍙樺寲鏃跺悓姝?savedSlugRef锛堜粎鍦ㄦ棤鏈湴淇敼鏃讹級
    useEffect(() => {
        if (!hasLocalChanges && selectedEntry) {
            savedSlugRef.current = selectedEntry.slug;
        }
    }, [selectedEntry, hasLocalChanges]);


    // --- 娲剧敓鐘舵€?(鏍戠姸鏋勫缓) ---
    const { flatTreeEntries, dictionaryMap } = useMemo(() => {
        // 1. 灏?entries 鏁扮粍杞崲涓轰互 word/lemma 涓洪敭鐨?Object Map
        const dictionaryMap = entries.reduce((acc, entry) => {
            if (entry.word) {
                acc[entry.word] = entry;
            }
            return acc;
        }, {});

        if (Object.keys(dictionaryMap).length === 0) {
            return { flatTreeEntries: [], dictionaryMap };
        }

        // 2. 鏋勫缓鏍戠姸缁撴瀯
        const { rootNodes, treeData } = buildTreeData(dictionaryMap);

        // 3. 灏嗘爲鐘剁粨鏋勮浆鎹负甯?level 鐨勬墎骞冲垪琛?
        const flatList = flattenTree(rootNodes, treeData, dictionaryMap);

        return { flatTreeEntries: flatList, dictionaryMap };
    }, [entries]); // 渚濊禆鍘熷 entries 鍒楄〃

    // doc heading map: abbreviation 鈫?{meaning, id} (for tag linking)
    const docHeadingsMap = useMemo(() => {
        const map = new Map();
        for (const h of docHeadings) {
            const text = h.text;
            const lastSpace = text.lastIndexOf(' ');
            if (lastSpace > 0) {
                const meaning = text.substring(0, lastSpace).trim();
                const abbrev = text.substring(lastSpace + 1).trim();
                const entry = { meaning, id: h.id };
                if (abbrev && !map.has(abbrev)) map.set(abbrev, entry);
                if (meaning && !map.has(meaning)) map.set(meaning, { meaning, id: h.id });
            }
            if (!map.has(text)) map.set(text, { meaning: text, id: h.id });
        }
        return map;
    }, [docHeadings]);

    // 澶勭悊鏍囩鐐瑰嚮璺宠浆
    const handleLinkClick = useCallback((type, term) => {
        if (type === 'entry' && dictionaryMap[term]) {
            setSelectedEntrySlug(dictionaryMap[term].slug);
        } else if (type === 'doc') {
            const hInfo = docHeadingsMap.get(term);
            const affix = hInfo?.id || '';
            window.open(`/docs?project=${projectId}&affix=${affix}`, '_blank');
        }
    }, [dictionaryMap, projectId, docHeadingsMap]);

    // 璐熻矗灏嗕慨鏀瑰悗鐨勮瘝鏉″璞℃洿鏂板埌鏈湴鐘舵€?(entries) 涓?
    const handleEntryChange = useCallback((updatedEntry) => {
        setEntries(prevEntries =>
            prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
        );
        setHasLocalChanges(true);
        lastModifiedEntryRef.current = updatedEntry;
        // 濡傛灉 slug 鍙樹簡锛坵ord 琚慨鏀癸級锛屾洿鏂?URL
        if (updatedEntry.slug !== selectedEntrySlug) {
            setSelectedEntrySlug(updatedEntry.slug);
        }
    }, [selectedEntrySlug]);

    // 4. 鏍稿績淇濆瓨鍑芥暟 (PUT) - 鎻愪氦鎸囧畾鐨勮瘝鏉″璞″埌 API
    const commitEntrySave = useCallback(async (entryToSave, isCleanup = false) => {
        if (!projectId || !entryToSave) {
            return false;
        }

        // 鐢?DB 涓綋鍓嶇殑 slug 鍙戣姹傦紙涓嶆槸鍙兘宸插彉鍖栫殑鏂?slug锛?
        const urlSlug = savedSlugRef.current || entryToSave.slug;

        console.log(`[Save] Committing entry: ${entryToSave.word} (urlSlug: ${urlSlug}, newSlug: ${entryToSave.slug})`);

        try {
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries/${urlSlug}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(projectId),
                    body: JSON.stringify(entryToSave),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to save entry after retries.');
                }
            }

            if (response.status === 401) {
                alert('授权已过期或无效，请返回项目页面重新授权');
                return false;
            }
            if (!response.ok) {
                alert(`保存失败: HTTP ${response.status}`);
                return false;
            }

            const updatedEntry = await response.json();

            // 鍚屾 DB 涓殑 slug
            savedSlugRef.current = updatedEntry.slug;
            if (updatedEntry.slug !== selectedEntrySlug) {
                setSelectedEntrySlug(updatedEntry.slug);
            }

            setHasLocalChanges(false);
            lastModifiedEntryRef.current = null;

            // 鐢?id 鍖归厤鏇存柊鏈湴 entries
            setEntries(prevEntries =>
                prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
            );

            console.log(`[Save] Successful: slug=${updatedEntry.slug}`);
            return true;

        } catch (error) {
            console.error(`[Save] Failed:`, error);
            alert(`保存失败: ${error.message}`);
            return false;
        }
    }, [projectId, selectedEntrySlug]);

    // 5. 瑙﹀彂淇濆瓨 (Ctrl+S 鎴栨墜鍔ㄦ寜閽?
    const saveDefinitions = useCallback(async () => {
        if (hasLocalChanges && selectedEntry) {
            console.log("Saving Entry via Ctrl+S or Button:", selectedEntry.word);
            await commitEntrySave(selectedEntry);
            setEditingSection(null); // 濡傛灉淇濆瓨鎴愬姛锛岄€€鍑虹紪杈戠姸鎬?
        } else {
            console.log("No local changes detected. Manual save skipped.");
        }
    }, [hasLocalChanges, selectedEntry, commitEntrySave]);

    const saveTempEdit = saveDefinitions; // 蹇嵎閿繚瀛橈紝涓?saveDefinitions 鐩稿悓

    // 6. 鑷姩娓呯悊淇濆瓨鍑芥暟 (鐢ㄤ簬 Entry 鍒囨崲鍜岀粍浠跺嵏杞?
    const saveIfDirty = useCallback(async () => {
        // 鍙湁褰?hasLocalChanges 涓?true 涓?Ref 涓湁鏁版嵁鏃讹紝鎵嶈繘琛岃嚜鍔ㄤ繚瀛?
        if (hasLocalChanges && lastModifiedEntryRef.current) {
            console.log("[Cleanup Save] Detected local changes on entry switch/unmount. Saving...");
            // 浣跨敤 Ref 涓殑鏁版嵁杩涜淇濆瓨锛岀‘淇濅繚瀛樼殑鏄垏鎹㈠墠鐨勭姸鎬?
            await commitEntrySave(lastModifiedEntryRef.current, true);
        } else {
            console.log("[Cleanup Save] No dirty state detected for current entry.");
        }
    }, [hasLocalChanges, commitEntrySave]);

    // --- 鏍稿績 Effect: 鐩戝惉 Entry 鍒囨崲鍜岀粍浠跺嵏杞?---
    useEffect(() => {
        // Cleanup function: runs right before the effect runs again (due to dependency change)
        // OR when the component unmounts.
        return () => {
            // 褰?Entry 鍒囨崲銆侀」鐩垏鎹㈡垨缁勪欢鍗歌浇鏃讹紝鑷姩淇濆瓨涓婁竴涓?Entry 鐨勪慨鏀?
            saveIfDirty();
        };
    }, [projectId, selectedEntrySlug, saveIfDirty]);

    // --- Effect: URL slug 鍙樺寲鏃跺悓姝ュ埌鐘舵€侊紙娴忚鍣ㄥ墠杩?鍚庨€€ / 鐩存帴杈撳叆 URL锛?--
    useEffect(() => {
        if (urlSlug && urlSlug !== selectedEntrySlug) {
            setSelectedEntrySlug(urlSlug);
        }
    }, [urlSlug]);

    // --- Effect: selectedEntrySlug 鍙樺寲鏃跺悓姝ュ埌娴忚鍣?URL ---
    useEffect(() => {
        if (selectedEntrySlug && selectedEntrySlug !== urlSlug) {
            // 淇濈暀 project 鏌ヨ鍙傛暟鍜?hash
            navigate(`/dictionary/${selectedEntrySlug}${location.search}${location.hash}`, { replace: true });
        }
    }, [selectedEntrySlug]);

    // --- Effect: URL hash 鍙樺寲鏃舵粴鍔ㄥ埌瀵瑰簲 sense ---
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.slice(1); // 鍘绘帀 #
            // 寤惰繜绛夊緟 DOM 娓叉煋瀹屾垚
            const timer = setTimeout(() => {
                const el = document.getElementById(id);
                if (el) {
                    const mainContent = document.querySelector('main.flex-1');
                    if (mainContent) {
                        const elRect = el.getBoundingClientRect();
                        const containerRect = mainContent.getBoundingClientRect();
                        mainContent.scrollTo({
                            top: mainContent.scrollTop + elRect.top - containerRect.top - 20,
                            behavior: 'smooth'
                        });
                    }
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [location.hash, selectedEntrySlug]);


    // --- 浜嬩欢澶勭悊鍣?(UI) ---
    const toggleGlobalEditMode = useCallback(() => projectStore.toggleGlobalEditMode(), []);
    const toggleLeftPanel = useCallback(() => setIsWordListOpen((prev) => !prev), []);
    const toggleRightPanel = useCallback(() => setIsTreeOpen((prev) => !prev), []);

    // 1. 鏇存柊涓昏瘝鏉″瓧娈?(Word, Transliteration)
    const handleUpdateEntry = useCallback((payload) => {
        if (!selectedEntry) return;
        if (!canEdit) return;

        // Payload 鍖呭惈瑕佹洿鏂扮殑涓诲瓧娈碉紝濡?{ word: '鏂拌瘝', transliteration: 'xin ci' }
        const updatedEntry = {
            ...selectedEntry,
            ...payload
        };

        // 濡傛灉 word 鍙樻洿浜嗭紝閲嶇畻 slug
        if (payload.word && payload.word !== selectedEntry.word) {
            updatedEntry.slug = wordToSlug(payload.word);
        }

        handleEntryChange(updatedEntry);
        console.log("Main entry fields updated locally. Press save (Ctrl+S) to commit.");

    }, [selectedEntry, handleEntryChange, canEdit]);

    // 2. 鏇存柊鍗曚釜涔夐」 (Sense) 瀛楁
    const handleUpdateSense = useCallback((senseId, payload) => {
        if (!selectedEntry) return;
        if (!canEdit) return;

        const newSenses = selectedEntry.senses.map(sense => {
            if (sense.sense_id === senseId) {
                // 鍚堝苟鏂扮殑瀛楁 (payload 鍙兘鏄?{ tags: [...] } 鎴?{ description: '...' })
                return {
                    ...sense,
                    ...payload
                };
            }
            console.log(`瑙﹀彂鎴愬姛${payload}`);
            return sense;
        });

        const updatedEntry = {
            ...selectedEntry,
            senses: newSenses
        };

        handleEntryChange(updatedEntry);
        console.log(`Sense #${senseId} updated locally. Press save (Ctrl+S) to commit.`);

    }, [selectedEntry, handleEntryChange, canEdit]);


    // 3. 鍒涘缓鏂拌瘝鏉?鈥?鎵撳紑妯℃€佹
    const handleCreateNewEntry = useCallback(() => {
        if (!projectId) return;
        if (!canEdit) return;
        setNewEntryWord('');
        setNewEntryTranslit('');
        setShowNewEntryModal(true);
    }, [projectId, canEdit]);

    // 3b. 妯℃€佹纭 鈥?瀹為檯鎻愪氦
    const handleSubmitNewEntry = useCallback(async () => {
        const word = newEntryWord.trim();
        if (!word) return;

        const transliteration = newEntryTranslit.trim() || word;

        const newEntryData = {
            word,
            transliteration,
            senses: [
                {
                    sense_id: 1,
                    displayed_tag: "new",
                    ipa: "pending",
                    description: "(edit sense description)",
                    definitions: [{ text: "(edit definition)", examples: ["(edit example)"] }],
                    tags: ["pending"],
                    derived_from: [],
                    derived_to: [],
                    chart_type: "",
                    morphology: {}
                }
            ]
        };

        setShowNewEntryModal(false);

        try {
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries`, {
                    method: 'POST',
                    headers: getAuthHeaders(projectId),
                    body: JSON.stringify(newEntryData),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to create new entry after retries.');
                }
            }
            if (response.status === 401) {
                alert('需要授权码才能创建词条');
                return;
            }
            if (!response.ok) throw new Error('Failed to create new entry.');

            const createdEntry = await response.json();
            await fetchEntries(false);
            setSelectedEntrySlug(createdEntry.slug);
            console.log("New entry created successfully:", createdEntry);
        } catch (error) {
            console.error('Error creating new entry:', error);
            alert('创建词条失败，请检查后端服务是否正在运行。');
        }
    }, [newEntryWord, newEntryTranslit, projectId, fetchEntries]);


    // 7. 鍒犻櫎璇嶆潯 (DELETE)
    const handleDeleteEntry = async (slugToDelete, word) => {
        if (!projectId || !slugToDelete) return;
        if (!canEdit) return;

        if (!window.confirm(`确定删除词条 "${word}" 吗？此操作不可撤销。`)) {
            return;
        }

        console.log(`Attempting to delete entry: ${slugToDelete}`);
        try {
            // ... (API 璋冪敤鍜岄噸璇曢€昏緫淇濇寔涓嶅彉)
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries/${slugToDelete}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(projectId),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to delete entry after retries.');
                }
            }
            if (response.status === 401) {
                alert('需要授权码才能删除词条');
                return;
            }
            if (!response.ok) throw new Error('Failed to delete entry.');


            // 鎴愬姛鍚庨噸鏂拌幏鍙栨暟鎹互姝ｇ‘鏇存柊鏍戠姸缁撴瀯鍜岄€変腑鐘舵€?
            await fetchEntries();

            console.log("Entry deleted successfully");

        } catch (error) {
            console.error("Delete failed:", error);
            console.error('Delete failed.');
        }
    };

    // 8. 娣诲姞涔夐」 (鍙慨鏀规湰鍦扮姸鎬?
    const handleAddSense = () => {
        if (!selectedEntry) return;
        if (!canEdit) return;

        // 鎵惧埌褰撳墠涔夐」鐨勬渶澶?ID 骞跺姞 1
        const currentMaxId = (selectedEntry.senses || []).reduce((max, s) => {
            return Math.max(max, s.sense_id || 0);
        }, 0);
        const newSenseId = currentMaxId + 1;

        const newSenseTemplate = {
            sense_id: newSenseId,
            displayed_tag: "new",
            ipa: "pending",
            derived_from: [],
            description: "(edit sense description)",
            tags: ["pending"],
            definitions: [{ text: "(edit definition)", examples: ["(edit example)"] }],
            chart_type: "",
            morphology: {},
            derived_to: []
        };

        const updatedEntry = {
            ...selectedEntry,
            senses: [...(selectedEntry.senses || []), newSenseTemplate]
        };

        handleEntryChange(updatedEntry);
        console.log(`Sense #${newSenseId} added locally. Press save (Ctrl+S) to commit.`);
    };

    // 9. 鍒犻櫎涔夐」 (鍙慨鏀规湰鍦扮姸鎬?
    const handleDeleteSense = (senseIdToDelete) => {
        if (!selectedEntry || !senseIdToDelete) return;
        if (!canEdit) return;

        // 鉀?鏇挎崲 window.confirm 涓鸿嚜瀹氫箟 UI
        if (!window.confirm("确定删除这个义项吗？需要保存后生效。")) {
            return;
        }

        const updatedEntry = {
            ...selectedEntry,
            senses: selectedEntry.senses.filter(s => s.sense_id !== senseIdToDelete)
        };

        handleEntryChange(updatedEntry);
        console.log("Sense deleted locally. Press save (Ctrl+S) to commit.");
    };


    // --- (*** 鏂板锛氬鐞?SearchBar 鐨勨€濈偣鍑昏烦杞€?***) ---
    const handleSearchSelect = useCallback((lemma) => {
        // SearchBar 杩斿洖鐨勬槸 lemma (瀛楃涓?
        // 鎴戜滑鐢?dictionaryMap 鏌ユ壘瀵瑰簲鐨?entry
        const selected = dictionaryMap[lemma];

        if (selected && selected.slug) {
            // 鎵惧埌浜嗭紒璋冪敤 setSelectedEntrySlug 鏉ュ疄鐜扳€濊烦杞€?
            setSelectedEntrySlug(selected.slug);
            // 纭繚宸︿晶鍒楄〃鏄墦寮€鐨勶紝浠ヤ究鐢ㄦ埛鐪嬪埌楂樹寒
            setIsWordListOpen(true);
        } else {
            console.warn(`Search selection failed: Lemma "${lemma}" not found in dictionaryMap.`);
        }
    }, [dictionaryMap]); // 渚濊禆 dictionaryMap

    const addDefinition = useCallback(() => {
        if (!selectedEntry) return;
        // ... (Definition adding logic should be here) ...
        console.log("Adding new definition for:", selectedEntrySlug);
    }, [selectedEntrySlug, selectedEntry]);


    // --- 蹇嵎閿?Hook 璋冪敤 ---
    useShortcuts({
        editingSection,
        saveDefinitions, // 浣跨敤鏂扮殑蹇嵎閿繚瀛樺嚱鏁?
        saveTempEdit,
        addDefinition,
        scrollToTop: () => entryEditorRef.current?.scrollToTop()
    });

    // --- 娓叉煋 ---
    return (
        <div className="flex flex-col h-screen antialiased bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">

            {/* 1. 椤堕儴鏍?*/}
            <Header
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                isGlobalEditMode={isGlobalEditMode}
                toggleGlobalEditMode={toggleGlobalEditMode}
                isWordListOpen={isWordListOpen}
                toggleLeftPanel={toggleLeftPanel}
                isTreeOpen={isTreeOpen}
                toggleRightPanel={toggleRightPanel}
                customFont={customFont}
                setCustomFont={setCustomFont}
                isFontInputVisible={isFontInputVisible}
                setIsFontInputVisible={setIsFontInputVisible}
                entries={entries}
                onSearchSelect={handleSearchSelect}
                projectId={projectId}
                buttonVisibility={buttonVisibility}
            />

            {/* 2. 涓诲唴瀹瑰尯 (3 鏍忓竷灞€) */}
            <div className="flex flex-1 overflow-hidden pt-28 lg:pt-16">

                {/* 宸︿晶鏍?*/}
                {fetchError ? (
                    <div className="w-full sm:w-64 p-4 border-r border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center gap-2">
                        <span className="text-red-600 dark:text-red-400 text-sm text-center">{fetchError}</span>
                        <button onClick={() => fetchEntries()} className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">重试</button>
                    </div>
                ) : (
                <WordList
                    entries={flatTreeEntries}
                    selectedEntrySlug={selectedEntrySlug}
                    onSelect={setSelectedEntrySlug}
                    isOpen={isWordListOpen}
                    canEdit={canEdit}
                    onDeleteEntry={handleDeleteEntry}
                    onAddNewEntry={handleCreateNewEntry}
                />
                )}

                {/* 涓棿缂栬緫鍖?*/}
                <EntryEditor
                    ref={entryEditorRef}
                    entry={selectedEntry}
                    projectId={projectId}
                    isGlobalEditMode={isGlobalEditMode}
                    setEditingSection={setEditingSection}
                    onUpdateEntry={handleUpdateEntry}
                    onUpdateSense={handleUpdateSense}
                    dictionaryMap={dictionaryMap}
                    onLinkClick={handleLinkClick}
                    docHeadingsMap={docHeadingsMap}
                />

                {/* 鍙充晶瀵艰埅鏍?*/}
                <HierarchyTree
                    entry={selectedEntry}
                    isOpen={isTreeOpen}
                    canEdit={canEdit}
                    onAddSense={handleAddSense}
                    onDeleteSense={handleDeleteSense}
                />
            </div>

            {/* 搴曢儴鐘舵€佹爮 */}
            <div className={clsx(
                    'fixed bottom-0 left-0 p-1.5 text-xs text-white rounded-tr-lg flex items-center gap-2 z-[100]',
                    isReadOnly ? 'bg-red-600' : hasLocalChanges ? 'bg-yellow-600' : 'bg-green-600'
                )}>
                <span>
                    {isReadOnly ? '访客只读' : hasLocalChanges ? '未保存' : '已保存'}
                </span>
                {authLevel && (
                    <span className="opacity-80">| {authLevel === 'admin' ? '管理员' : '编辑者'}</span>
                )}
            </div>

            {/* 鏂板缓璇嶆潯妯℃€佹 */}
            {showNewEntryModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowNewEntryModal(false)}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                        <div className="px-6 pt-6 pb-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">新建词条</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">填写词形和转写来创建新词条。</p>
                        </div>

                        <div className="px-6 py-4 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    词形 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newEntryWord}
                                    onChange={(e) => {
                                        setNewEntryWord(e.target.value);
                                        if (!newEntryTranslit || newEntryTranslit === newEntryWord) {
                                            setNewEntryTranslit(e.target.value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newEntryWord.trim()) handleSubmitNewEntry();
                                        if (e.key === 'Escape') setShowNewEntryModal(false);
                                    }}
                                    placeholder="输入词形..."
                                    autoFocus
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    转写
                                </label>
                                <input
                                    type="text"
                                    value={newEntryTranslit}
                                    onChange={(e) => setNewEntryTranslit(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newEntryWord.trim()) handleSubmitNewEntry();
                                        if (e.key === 'Escape') setShowNewEntryModal(false);
                                    }}
                                    placeholder="输入转写..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewEntryModal(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmitNewEntry}
                                disabled={!newEntryWord.trim()}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                            >
                                创建词条
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default DictionaryPage;
