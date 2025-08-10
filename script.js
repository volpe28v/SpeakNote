// DOM要素の取得
const englishInput = document.getElementById('english-input');
const speakButton = document.getElementById('speak-button');
const translateButton = document.getElementById('translate-button');
const translationText = document.getElementById('translation-text');
const saveButton = document.getElementById('save-button');
const speakJapaneseButton = document.getElementById('speak-japanese-button');
const clearButton = document.getElementById('clear-button');

// 翻訳履歴を管理する配列
let translationLines = [];

// 編集中のアイテムID（更新保存のため）
let currentEditingId = null;

// 保存機能のための定数
const STORAGE_KEY = 'speakNote_savedSentences';
const MAX_SAVED_ITEMS = 100;

// 音声合成の設定定数
const SPEECH_CONFIG = {
    ENGLISH: {
        lang: 'en-GB',
        rate: 0.7,
        pitch: 1.0,
        volume: 1.0
    },
    ENGLISH_QUESTION: {
        lang: 'en-GB',
        rate: 0.7,
        pitch: 1.2,
        volume: 1.0
    },
    JAPANESE: {
        lang: 'ja-JP',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
    },
    PAUSE: {
        lang: 'en-GB',
        rate: 0.5,
        pitch: 1.0,
        volume: 1.0
    }
};

// Web Speech APIの確認
if (!('speechSynthesis' in window)) {
    Toast.error('お使いのブラウザは音声合成に対応していません。');
}

// 音声合成用のUtteranceを作成する共通関数
function createUtterance(text, config) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = config.lang;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;
    return utterance;
}

// 複数行のテキストを順番に発音する共通関数
function speakMultipleLines(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    // 既存の発音をキャンセル
    window.speechSynthesis.cancel();
    
    // 各行を順番に発音（間に一拍置く）
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const utterance = createUtterance(line, SPEECH_CONFIG.ENGLISH);
        window.speechSynthesis.speak(utterance);
        
        // 最後の行でなければ一拍置く
        if (i < lines.length - 1) {
            const pause = createUtterance(' ', SPEECH_CONFIG.PAUSE);
            window.speechSynthesis.speak(pause);
        }
    }
}

// 翻訳表示を更新する関数
function updateTranslationDisplay() {
    translationText.value = translationLines.join('\n');
}

// 現在の行番号を取得する関数
function getCurrentLineNumber(textarea) {
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    return textBeforeCursor.split('\n').length - 1;
}

// 英語を発音する関数
function speakEnglish(text, isQuestion = false) {
    // 空文字の場合は処理しない
    if (!text.trim()) return;

    // 既存の発音をキャンセル
    window.speechSynthesis.cancel();

    // 単独の大文字「I」の場合、発音を改善するため小文字に変換
    let processedText = text;
    if (text === 'I') {
        processedText = 'i';
    }

    // 設定を選択して発音実行
    const config = isQuestion ? SPEECH_CONFIG.ENGLISH_QUESTION : SPEECH_CONFIG.ENGLISH;
    const utterance = createUtterance(processedText, config);
    window.speechSynthesis.speak(utterance);
}

// 日本語を発音する関数
function speakJapanese(text) {
    // 空文字の場合は処理しない
    if (!text.trim()) {
        Toast.info('翻訳テキストがありません。まず翻訳ボタンを押してください。');
        return;
    }

    // 既存の発音をキャンセル
    window.speechSynthesis.cancel();

    // 発音実行
    const utterance = createUtterance(text, SPEECH_CONFIG.JAPANESE);
    window.speechSynthesis.speak(utterance);
}

// Google Apps Script翻訳APIのURL（デプロイ後に設定）
const GAS_TRANSLATE_URL = 'https://script.google.com/macros/s/AKfycbyTSE6S8wnGYDQhQ3gKeVwIiDt3uwlxZoUBFfJ3YCrc1dCn76sQR3YJ5bM2vsuVEboc/exec';

// 翻訳状態を管理
let isTranslating = false;

// UI文字列の定数
const UI_STRINGS = {
    TRANSLATING: '🔄 翻訳中...',
    TRANSLATING_PROGRESS: (current, total) => `🔄 翻訳中... (${current}/${total})`,
    TRANSLATE: '🔁 翻訳',
    TRANSLATION_ERROR: '翻訳中にエラーが発生しました',
    API_NOT_SET: '翻訳APIが設定されていません。README.mdを参照してGoogle Apps Scriptを設定してください。',
    SAVE_NEW: '💾 保存',
    SAVE_UPDATE: '📝 更新',
    NEW_NOTE: '📄 新規作成',
    SAVED_NEW: '保存しました！',
    UPDATED: '更新しました！'
};

// 翻訳状態の管理関数
const TranslationState = {
    start: () => {
        isTranslating = true;
        translateButton.disabled = true;
        translateButton.textContent = UI_STRINGS.TRANSLATING;
        translateButton.style.opacity = '0.6';
    },
    
    updateProgress: (current, total) => {
        translateButton.textContent = UI_STRINGS.TRANSLATING_PROGRESS(current, total);
    },
    
    finish: () => {
        isTranslating = false;
        translateButton.disabled = false;
        translateButton.textContent = UI_STRINGS.TRANSLATE;
        translateButton.style.opacity = '1';
    },
    
    handleError: (error, showAlert = true) => {
        console.error('Translation error:', error);
        if (showAlert) {
            Toast.error(UI_STRINGS.TRANSLATION_ERROR);
        }
        TranslationState.finish();
    }
};

// 編集状態の管理関数
const EditingState = {
    startEditing: (itemId) => {
        currentEditingId = itemId;
        EditingState.updateUI();
        EditingState.updateSavedSentenceHighlight();
    },
    
    startNew: () => {
        currentEditingId = null;
        EditingState.updateUI();
        EditingState.updateSavedSentenceHighlight();
    },
    
    updateUI: () => {
        const isEditing = currentEditingId !== null;
        saveButton.textContent = isEditing ? UI_STRINGS.SAVE_UPDATE : UI_STRINGS.SAVE_NEW;
        clearButton.textContent = UI_STRINGS.NEW_NOTE;
    },
    
    updateSavedSentenceHighlight: () => {
        // 全てのノートのハイライトをリセット
        document.querySelectorAll('.saved-sentence-item').forEach(item => {
            item.classList.remove('editing');
        });
        
        // 編集中のアイテムがあればハイライト
        if (currentEditingId) {
            const editingItem = document.querySelector(`[data-id="${currentEditingId}"]`);
            if (editingItem) {
                editingItem.classList.add('editing');
            }
        }
    }
};

// トースト通知システム
const Toast = {
    show: (message, type = 'info', duration = 3000) => {
        const container = document.getElementById('toast-container');
        
        // トースト要素を作成
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // コンテナに追加
        container.appendChild(toast);
        
        // アニメーション開始
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 自動削除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, duration);
    },
    
    success: (message, duration = 3000) => Toast.show(message, 'success', duration),
    error: (message, duration = 4000) => Toast.show(message, 'error', duration),
    info: (message, duration = 3000) => Toast.show(message, 'info', duration),
    warning: (message, duration = 3500) => Toast.show(message, 'warning', duration)
};

// Google翻訳APIを使用した翻訳関数
async function translateWithGoogleAPI(text) {
    if (!GAS_TRANSLATE_URL) {
        console.warn('Google Apps Script URLが設定されていません');
        return '翻訳APIが設定されていません';
    }

    try {
        const response = await fetch(
            `${GAS_TRANSLATE_URL}?text=${encodeURIComponent(text)}&source=en&target=ja`
        );
        const data = await response.json();
        
        if (data.success) {
            return data.text;
        } else {
            console.error('Translation API error:', data.error);
            return '翻訳エラー: ' + data.error;
        }
    } catch (error) {
        console.error('Network error:', error);
        return '通信エラー: 翻訳できませんでした';
    }
}


// ボタンクリックイベント
speakButton.addEventListener('click', async () => {
    speakMultipleLines(englishInput.value);
});

// 翻訳ボタンクリックイベント（全体を再翻訳）
translateButton.addEventListener('click', async () => {
    if (isTranslating) return; // 翻訳中は無効化
    
    const englishLines = englishInput.value.split('\n');
    translationLines = [];
    
    // 翻訳中の状態を表示
    TranslationState.start();
    
    // 翻訳進捗表示用のカウンター
    let completedLines = 0;
    const totalLines = englishLines.filter(line => line.trim()).length;
    
    if (totalLines > 1) {
        TranslationState.updateProgress(completedLines, totalLines);
    }
    
    try {
        // Google Apps Script APIが設定されている場合
        if (GAS_TRANSLATE_URL) {
            // 各行を個別に翻訳
            for (let index = 0; index < englishLines.length; index++) {
                const line = englishLines[index];
                if (line.trim()) {
                    // 翻訳中のアニメーション
                    if (totalLines > 1) {
                        TranslationState.updateProgress(completedLines + 1, totalLines);
                    }
                    
                    const translation = await translateWithGoogleAPI(line.trim());
                    translationLines[index] = translation;
                    completedLines++;
                    
                    // リアルタイムで翻訳結果を表示
                    updateTranslationDisplay();
                    
                    // 進捗更新
                    if (totalLines > 1) {
                        TranslationState.updateProgress(completedLines, totalLines);
                    }
                } else {
                    translationLines[index] = '';
                }
            }
        } else {
            // Google Apps Script URLが設定されていない場合
            Toast.warning(UI_STRINGS.API_NOT_SET);
            TranslationState.finish();
            return;
        }
        
        updateTranslationDisplay();
        TranslationState.finish();
    } catch (error) {
        TranslationState.handleError(error);
    }
});

// 日本語読上げボタンクリックイベント
speakJapaneseButton.addEventListener('click', () => {
    const japaneseText = translationText.value;
    speakJapanese(japaneseText);
});

// localStorage関連の関数
function getNotes() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

function saveNote(text, translations = null) {
    if (!text.trim()) return false;
    
    const notes = getNotes();
    const trimmedText = text.trim();
    const cleanTranslations = translations || [];
    
    // 編集中のアイテムがある場合は更新処理
    if (currentEditingId) {
        const editingIndex = notes.findIndex(item => item.id === currentEditingId);
        if (editingIndex !== -1) {
            // 既存のアイテムを更新
            notes[editingIndex] = {
                ...notes[editingIndex],
                text: trimmedText,
                translations: cleanTranslations,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            return { type: 'updated', id: currentEditingId };
        }
    }
    
    // 新規作成の場合：重複チェック
    const existingItem = notes.find(item => item.text === trimmedText);
    if (existingItem) {
        // 翻訳が同じかチェック
        const existingTranslations = existingItem.translations || [];
        
        // 翻訳内容が同じ場合のみ重複エラー
        if (JSON.stringify(existingTranslations) === JSON.stringify(cleanTranslations)) {
            Toast.info('このノートは既に保存されています。');
            return false;
        }
        
        // 翻訳が異なる場合は確認ダイアログを表示
        if (confirm('同じ英文のノートですが、翻訳が異なります。新しい翻訳で上書きしますか？')) {
            // 既存のアイテムを削除
            const index = notes.findIndex(item => item.id === existingItem.id);
            if (index !== -1) {
                notes.splice(index, 1);
            }
        } else {
            return false;
        }
    }
    
    // 新しいアイテムを作成
    const newItem = {
        id: Date.now(),
        text: trimmedText,
        translations: cleanTranslations,
        timestamp: new Date().toISOString()
    };
    
    // 配列の先頭に追加
    notes.unshift(newItem);
    
    // 最大数を超えた場合、古いものを削除
    if (notes.length > MAX_SAVED_ITEMS) {
        notes.splice(MAX_SAVED_ITEMS);
    }
    
    // localStorageに保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    
    // 新規作成時はIDを含めた結果を返す
    return { type: 'saved', id: newItem.id };
}

function deleteNote(id) {
    const notes = getNotes();
    const filtered = notes.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// ノート一覧を表示する関数
function displayNotes() {
    const notes = getNotes();
    const listContainer = document.getElementById('saved-sentences-list');
    
    if (notes.length === 0) {
        listContainer.innerHTML = '<div class="no-notes">ノートがありません</div>';
        return;
    }
    
    // 既存の内容をクリア
    listContainer.innerHTML = '';
    
    // 各アイテムを動的に作成
    notes.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'saved-sentence-item';
        itemDiv.dataset.id = item.id;
        
        // 英文と翻訳を含むコンテナ
        const contentDiv = document.createElement('div');
        contentDiv.className = 'sentence-content';
        
        // 英文を1行に収まるように表示（改行を空白に置換）
        const displayEnglish = item.text.replace(/\n/g, ' ');
        
        const textDiv = document.createElement('div');
        textDiv.className = 'sentence-text';
        textDiv.textContent = displayEnglish;
        
        // 翻訳がある場合は表示（改行を空白に置換して1行に）
        if (item.translations && item.translations.length > 0) {
            const translationDiv = document.createElement('div');
            translationDiv.className = 'sentence-translation';
            const displayTranslation = item.translations.join(' ');
            translationDiv.textContent = displayTranslation;
            contentDiv.appendChild(textDiv);
            contentDiv.appendChild(translationDiv);
        } else {
            contentDiv.appendChild(textDiv);
        }
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'sentence-actions';
        
        // 発音ボタン
        const speakBtn = document.createElement('button');
        speakBtn.className = 'action-button speak-action';
        speakBtn.textContent = '▶️';
        speakBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // ノート選択イベントを防ぐ
            speakNote(item.text);
        });
        
        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-button delete-action';
        deleteBtn.textContent = '❌';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // ノート選択イベントを防ぐ
            deleteNoteById(item.id);
        });
        
        actionsDiv.appendChild(speakBtn);
        actionsDiv.appendChild(deleteBtn);
        
        // ノート全体をクリッカブルにする
        itemDiv.addEventListener('click', () => {
            loadNote(item);
        });
        
        itemDiv.appendChild(contentDiv);
        itemDiv.appendChild(actionsDiv);
        
        listContainer.appendChild(itemDiv);
    });
    
    // 編集中のアイテムをハイライト
    EditingState.updateSavedSentenceHighlight();
}

// ノートを読み上げる関数
function speakNote(text) {
    speakMultipleLines(text);
}

// ノートを入力エリアに読み込む関数
function loadNote(item) {
    englishInput.value = item.text;
    englishInput.focus();
    
    // 保存された翻訳がある場合は表示
    if (item.translations && item.translations.length > 0) {
        translationLines = item.translations;
        updateTranslationDisplay();
    } else {
        // 翻訳がない場合はクリア
        translationLines = [];
        translationText.value = '';
    }
    
    // 編集状態を開始
    EditingState.startEditing(item.id);
}

// ノートを削除する関数（UI用）
function deleteNoteById(id) {
    if (confirm('このノートを削除しますか？')) {
        // 削除するアイテムが編集中の場合は編集状態をリセット
        if (currentEditingId === id) {
            EditingState.startNew();
            englishInput.value = '';
            translationText.value = '';
            translationLines = [];
        }
        
        deleteNote(id);
        displayNotes(); // 一覧を更新
    }
}

// 保存ボタンクリックイベント
saveButton.addEventListener('click', () => {
    const text = englishInput.value;
    // 現在の翻訳も一緒に保存
    const result = saveNote(text, translationLines);
    if (result && result.type === 'updated') {
        Toast.success(UI_STRINGS.UPDATED);
        displayNotes(); // 一覧を更新
        // 更新後も編集状態を維持
        EditingState.startEditing(result.id);
    } else if (result && result.type === 'saved') {
        Toast.success(UI_STRINGS.SAVED_NEW);
        displayNotes(); // 一覧を更新
        // 新規保存後は編集モードに移行
        EditingState.startEditing(result.id);
    }
    // falseの場合は既にsaveNote内でアラートが表示される
});

// 新規作成ボタンクリックイベント（旧クリアボタン）
clearButton.addEventListener('click', () => {
    // 入力内容や編集状態がある場合のみ確認ダイアログを表示
    const hasContent = englishInput.value.trim() || translationText.value.trim();
    const isEditing = currentEditingId !== null;
    
    if (hasContent || isEditing) {
        const message = isEditing ? '編集中の内容を破棄して新規作成しますか？' : '入力内容をクリアして新規作成しますか？';
        if (confirm(message)) {
            englishInput.value = '';
            translationText.value = '';
            translationLines = [];
            EditingState.startNew(); // 編集状態をリセット
            englishInput.focus();
        }
    } else {
        // 既に空で編集状態でもない場合は確認なしでフォーカスのみ
        EditingState.startNew(); // UIを確実に更新
        englishInput.focus();
    }
});

// ページ読み込み時にノートを表示
document.addEventListener('DOMContentLoaded', () => {
    displayNotes();
    EditingState.startNew(); // UIを初期状態に設定
});

// 直前の単語を取得する関数
function getLastWord(text) {
    const words = text.trim().split(/\s+/);
    return words[words.length - 1] || '';
}

// 現在の行を取得する関数
function getCurrentLine(textarea) {
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    return lines[lines.length - 1];
}

// エンターキーで現在行を文として発音・翻訳、スペースキーで直前の単語を発音、ピリオドで文発音のみ
englishInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        // エンターキーが押される前に現在の行番号と行内容を取得
        const lineNumber = getCurrentLineNumber(englishInput);
        const currentLine = getCurrentLine(englishInput);
        
        if (currentLine.trim()) {
            // 現在行を文として発音
            speakEnglish(currentLine.trim(), false);
            
            // 自動的に現在行を翻訳
            if (GAS_TRANSLATE_URL && !isTranslating) {
                // 翻訳中の状態を表示
                TranslationState.start();
                
                try {
                    const translation = await translateWithGoogleAPI(currentLine.trim());
                    // 翻訳結果を対応する行に設定
                    while (translationLines.length <= lineNumber) {
                        translationLines.push('');
                    }
                    translationLines[lineNumber] = translation;
                    updateTranslationDisplay();
                    TranslationState.finish();
                } catch (error) {
                    TranslationState.handleError(error, false); // 自動翻訳時はアラートを表示しない
                }
            }
        }
        // エンターキーは通常通り改行として動作
    } else if (event.key === ' ') {
        // スペースキーが押されたら現在行の直前の単語を発音（翻訳は更新しない）
        const currentLine = getCurrentLine(englishInput);
        
        // 句読点の直後かどうかをチェック
        const lastChar = currentLine.slice(-1);
        const isPunctuationBefore = /[.!?]/.test(lastChar);
        
        if (!isPunctuationBefore && currentLine.trim()) {
            const lastWord = getLastWord(currentLine);
            if (lastWord) {
                // 単語のみを発音（翻訳は更新しない）
                window.speechSynthesis.cancel();
                let processedText = lastWord === 'I' ? 'i' : lastWord;
                const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH);
                window.speechSynthesis.speak(utterance);
            }
        }
        // スペースは通常通り入力される
    } else if (event.key === '.' || event.key === '?' || event.key === '!') {
        // ピリオド、疑問符、感嘆符が押されたら、現在行を発音のみ（翻訳は更新しない）
        const punctuation = event.key;
        setTimeout(() => {
            const currentLine = getCurrentLine(englishInput);
            if (currentLine.trim()) {
                // 疑問符の場合は疑問文として発音のみ
                window.speechSynthesis.cancel();
                let processedText = currentLine.trim();
                const config = punctuation === '?' ? SPEECH_CONFIG.ENGLISH_QUESTION : SPEECH_CONFIG.ENGLISH;
                const utterance = createUtterance(processedText, config);
                window.speechSynthesis.speak(utterance);
            }
        }, 50);
    }
});