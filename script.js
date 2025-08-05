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

// 保存機能のための定数
const STORAGE_KEY = 'speakNote_savedSentences';
const MAX_SAVED_ITEMS = 100;

// Web Speech APIの確認
if (!('speechSynthesis' in window)) {
    alert('お使いのブラウザは音声合成に対応していません。');
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
function speakEnglish(text, isQuestion = false, isFullSentence = false, lineNumber = null) {
    // 空文字の場合は処理しない
    if (!text.trim()) return;

    // 既存の発音をキャンセル
    window.speechSynthesis.cancel();

    // 翻訳ボタンを押した時のみ翻訳するため、ここでは翻訳を実行しない
    // 以前の自動翻訳機能をコメントアウト
    /*
    const translation = translateToJapanese(text, isFullSentence);
    
    if (lineNumber !== null) {
        while (translationLines.length <= lineNumber) {
            translationLines.push('');
        }
        translationLines[lineNumber] = translation;
        updateTranslationDisplay();
    } else {
        translationText.value = translation;
    }
    */

    // 単独の大文字「I」の場合、発音を改善するため小文字に変換
    let processedText = text;
    if (text === 'I') {
        processedText = 'i';
    }

    // 発音の設定
    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.lang = 'en-US'; // アメリカ英語
    utterance.rate = 0.9; // 少しゆっくり目
    utterance.pitch = isQuestion ? 1.2 : 1.0; // 疑問文の場合は少し高めのピッチ
    utterance.volume = 1.0; // 最大音量

    // 発音実行
    window.speechSynthesis.speak(utterance);
}

// 日本語を発音する関数
function speakJapanese(text) {
    // 空文字の場合は処理しない
    if (!text.trim()) {
        alert('翻訳テキストがありません。まず翻訳ボタンを押してください。');
        return;
    }

    // 既存の発音をキャンセル
    window.speechSynthesis.cancel();

    // 発音の設定
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; // 日本語
    utterance.rate = 1.0; // 通常の速度
    utterance.pitch = 1.0; // 通常のピッチ
    utterance.volume = 1.0; // 最大音量

    // 発音実行
    window.speechSynthesis.speak(utterance);
}

// Google Apps Script翻訳APIのURL（デプロイ後に設定）
const GAS_TRANSLATE_URL = 'https://script.google.com/macros/s/AKfycbyTSE6S8wnGYDQhQ3gKeVwIiDt3uwlxZoUBFfJ3YCrc1dCn76sQR3YJ5bM2vsuVEboc/exec';

// 翻訳状態を管理
let isTranslating = false;

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
speakButton.addEventListener('click', () => {
    const text = englishInput.value;
    speakEnglish(text, false, true); // 全文として翻訳
});

// 翻訳ボタンクリックイベント（全体を再翻訳）
translateButton.addEventListener('click', async () => {
    if (isTranslating) return; // 翻訳中は無効化
    
    const englishLines = englishInput.value.split('\n');
    translationLines = [];
    
    // 翻訳中の状態を表示
    isTranslating = true;
    translateButton.disabled = true;
    translateButton.textContent = '🔄 翻訳中...';
    translateButton.style.opacity = '0.6';
    
    // 翻訳進捗表示用のカウンター
    let completedLines = 0;
    const totalLines = englishLines.filter(line => line.trim()).length;
    
    // 進捗表示関数
    const updateProgress = () => {
        translateButton.textContent = `🔄 翻訳中... (${completedLines}/${totalLines})`;
    };
    
    if (totalLines > 1) {
        updateProgress();
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
                        translateButton.textContent = `🔄 翻訳中... (${completedLines + 1}/${totalLines})`;
                    }
                    
                    const translation = await translateWithGoogleAPI(line.trim());
                    translationLines[index] = translation;
                    completedLines++;
                    
                    // リアルタイムで翻訳結果を表示
                    updateTranslationDisplay();
                    
                    // 進捗更新
                    if (totalLines > 1) {
                        updateProgress();
                    }
                } else {
                    translationLines[index] = '';
                }
            }
        } else {
            // Google Apps Script URLが設定されていない場合
            alert('翻訳APIが設定されていません。README.mdを参照してGoogle Apps Scriptを設定してください。');
            return;
        }
        
        updateTranslationDisplay();
    } catch (error) {
        console.error('Translation error:', error);
        alert('翻訳中にエラーが発生しました');
    } finally {
        // 翻訳完了後の状態に戻す
        isTranslating = false;
        translateButton.disabled = false;
        translateButton.textContent = '🔁 翻訳';
        translateButton.style.opacity = '1';
    }
});

// 日本語読上げボタンクリックイベント
speakJapaneseButton.addEventListener('click', () => {
    const japaneseText = translationText.value;
    speakJapanese(japaneseText);
});

// localStorage関連の関数
function getSavedSentences() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

function saveSentence(text, translations = null) {
    if (!text.trim()) return false;
    
    const savedSentences = getSavedSentences();
    
    // 重複チェック（英文と翻訳の両方が同じ場合のみ重複とする）
    const existingItem = savedSentences.find(item => item.text === text.trim());
    if (existingItem) {
        // 翻訳が同じかチェック
        const existingTranslations = existingItem.translations || [];
        const newTranslations = translations || [];
        
        // 翻訳内容が同じ場合のみ重複エラー
        if (JSON.stringify(existingTranslations) === JSON.stringify(newTranslations)) {
            alert('この文は既に保存されています。');
            return false;
        }
        
        // 翻訳が異なる場合は確認ダイアログを表示
        if (confirm('同じ英文ですが、翻訳が異なります。新しい翻訳で上書きしますか？')) {
            // 既存のアイテムを削除
            const index = savedSentences.findIndex(item => item.id === existingItem.id);
            if (index !== -1) {
                savedSentences.splice(index, 1);
            }
        } else {
            return false;
        }
    }
    
    // 新しいアイテムを作成
    const newItem = {
        id: Date.now(),
        text: text.trim(),
        translations: translations || [], // 日本語訳を保存
        timestamp: new Date().toISOString()
    };
    
    // 配列の先頭に追加
    savedSentences.unshift(newItem);
    
    // 最大数を超えた場合、古いものを削除
    if (savedSentences.length > MAX_SAVED_ITEMS) {
        savedSentences.splice(MAX_SAVED_ITEMS);
    }
    
    // localStorageに保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSentences));
    
    return true;
}

function deleteSavedSentence(id) {
    const savedSentences = getSavedSentences();
    const filtered = savedSentences.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// 保存済み文一覧を表示する関数
function displaySavedSentences() {
    const savedSentences = getSavedSentences();
    const listContainer = document.getElementById('saved-sentences-list');
    
    if (savedSentences.length === 0) {
        listContainer.innerHTML = '<div class="no-saved-sentences">保存された文はありません</div>';
        return;
    }
    
    // 既存の内容をクリア
    listContainer.innerHTML = '';
    
    // 各アイテムを動的に作成
    savedSentences.forEach(item => {
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
        speakBtn.addEventListener('click', () => speakSavedSentence(item.text));
        
        // 読み込みボタン
        const loadBtn = document.createElement('button');
        loadBtn.className = 'action-button load-action';
        loadBtn.textContent = '✏️';
        loadBtn.addEventListener('click', () => loadSavedSentence(item));
        
        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-button delete-action';
        deleteBtn.textContent = '❌';
        deleteBtn.addEventListener('click', () => deleteSavedSentenceById(item.id));
        
        actionsDiv.appendChild(speakBtn);
        actionsDiv.appendChild(loadBtn);
        actionsDiv.appendChild(deleteBtn);
        
        itemDiv.appendChild(contentDiv);
        itemDiv.appendChild(actionsDiv);
        
        listContainer.appendChild(itemDiv);
    });
}

// 保存済み文を読み上げる関数
function speakSavedSentence(text) {
    speakEnglish(text, false, true);
}

// 保存済み文を入力エリアに読み込む関数
function loadSavedSentence(item) {
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
}

// 保存済み文を削除する関数（UI用）
function deleteSavedSentenceById(id) {
    if (confirm('この文を削除しますか？')) {
        deleteSavedSentence(id);
        displaySavedSentences(); // 一覧を更新
    }
}

// 保存ボタンクリックイベント
saveButton.addEventListener('click', () => {
    const text = englishInput.value;
    // 現在の翻訳も一緒に保存
    if (saveSentence(text, translationLines)) {
        alert('保存しました！');
        displaySavedSentences(); // 一覧を更新
    }
});

// クリアボタンクリックイベント
clearButton.addEventListener('click', () => {
    // 入力内容がある場合のみ確認ダイアログを表示
    if (englishInput.value.trim() || translationText.value.trim()) {
        if (confirm('入力内容をクリアしてもよろしいですか？')) {
            englishInput.value = '';
            translationText.value = '';
            translationLines = [];
            englishInput.focus();
        }
    } else {
        // 既に空の場合は確認なしでフォーカスのみ
        englishInput.focus();
    }
});

// ページ読み込み時に保存済み文を表示
document.addEventListener('DOMContentLoaded', () => {
    displaySavedSentences();
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
            speakEnglish(currentLine.trim(), false, true);
            
            // 自動的に現在行を翻訳
            if (GAS_TRANSLATE_URL && !isTranslating) {
                // 翻訳中の状態を表示
                isTranslating = true;
                translateButton.disabled = true;
                translateButton.textContent = '🔄 翻訳中...';
                translateButton.style.opacity = '0.6';
                
                try {
                    const translation = await translateWithGoogleAPI(currentLine.trim());
                    // 翻訳結果を対応する行に設定
                    while (translationLines.length <= lineNumber) {
                        translationLines.push('');
                    }
                    translationLines[lineNumber] = translation;
                    updateTranslationDisplay();
                } catch (error) {
                    console.error('Auto translation error:', error);
                } finally {
                    // 翻訳完了後の状態に戻す
                    isTranslating = false;
                    translateButton.disabled = false;
                    translateButton.textContent = '🔁 翻訳';
                    translateButton.style.opacity = '1';
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
                const utterance = new SpeechSynthesisUtterance(processedText);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
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
                const utterance = new SpeechSynthesisUtterance(processedText);
                utterance.lang = 'en-US';
                utterance.rate = 0.9; 
                utterance.pitch = punctuation === '?' ? 1.2 : 1.0;
                utterance.volume = 1.0;
                window.speechSynthesis.speak(utterance);
            }
        }, 50);
    }
});