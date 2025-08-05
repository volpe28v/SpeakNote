// DOM要素の取得
const englishInput = document.getElementById('english-input');
const speakButton = document.getElementById('speak-button');
const translateButton = document.getElementById('translate-button');
const translationText = document.getElementById('translation-text');
const saveButton = document.getElementById('save-button');

// 翻訳履歴を管理する配列
let translationLines = [];

// 保存機能のための定数
const STORAGE_KEY = 'speakNote_savedSentences';
const MAX_SAVED_ITEMS = 20;

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

// Google Apps Script翻訳APIのURL（デプロイ後に設定）
const GAS_TRANSLATE_URL = 'https://script.google.com/macros/s/AKfycbyTSE6S8wnGYDQhQ3gKeVwIiDt3uwlxZoUBFfJ3YCrc1dCn76sQR3YJ5bM2vsuVEboc/exec';

// 翻訳状態を管理
let isTranslating = false;

// Google翻訳APIを使用した翻訳関数
async function translateWithGoogleAPI(text) {
    if (!GAS_TRANSLATE_URL) {
        console.warn('Google Apps Script URLが設定されていません');
        return translateToJapanese(text, true); // フォールバック
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
            return translateToJapanese(text, true); // フォールバック
        }
    } catch (error) {
        console.error('Network error:', error);
        return translateToJapanese(text, true); // フォールバック
    }
}

// 簡易翻訳関数（フォールバック用）
function translateToJapanese(text, isFullSentence = false) {
    // 基本的な単語とフレーズの辞書
    const dictionary = {
        'hello': 'こんにちは',
        'world': '世界',
        'i': '私',
        'am': 'です/である',
        'a': '一つの',
        'student': '学生',
        'good': '良い',
        'morning': '朝',
        'how': 'どのように',
        'are': 'です/である',
        'you': 'あなた',
        'fine': '元気',
        'thank': '感謝する',
        'thanks': 'ありがとう',
        'my': '私の',
        'name': '名前',
        'is': 'です/である',
        'nice': '素晴らしい',
        'to': 'へ/に',
        'meet': '会う',
        'what': '何',
        'your': 'あなたの',
        'where': 'どこ',
        'when': 'いつ',
        'why': 'なぜ',
        'who': '誰',
        'this': 'これ',
        'that': 'それ',
        'yes': 'はい',
        'no': 'いいえ',
        'please': 'お願いします',
        'sorry': 'すみません',
        'excuse': '失礼',
        'me': '私を',
        'can': 'できる',
        'help': '助ける',
        'love': '愛する',
        'like': '好き',
        'book': '本',
        'cat': '猫',
        'dog': '犬',
        'have': '持っている',
        'pen': 'ペン'
    };

    // 文全体のパターン翻訳（よく使われる表現）
    const sentencePatterns = {
        'hello world': 'こんにちは世界',
        'i am a student': '私は学生です',
        'good morning': 'おはようございます',
        'how are you': '元気ですか',
        'i am fine': '私は元気です',
        'thank you': 'ありがとう',
        'my name is': '私の名前は',
        'nice to meet you': 'はじめまして',
        'what is your name': 'あなたの名前は何ですか',
        'where are you': 'あなたはどこにいますか',
        'i love you': '愛しています',
        'can you help me': '助けてもらえますか',
        'i have a pen': '私はペンを持っています',
        'you have a pen': 'あなたはペンを持っています'
    };

    if (!text.trim()) return 'まず英語を入力してください';

    const cleanText = text.toLowerCase().replace(/[.,!?]/g, '');

    // 一文として翻訳する場合、まず文全体のパターンをチェック
    if (isFullSentence && sentencePatterns[cleanText]) {
        return sentencePatterns[cleanText];
    }

    // 単語ごとの翻訳（従来の方法）
    const words = cleanText.split(/\s+/);
    const translations = words.map(word => dictionary[word] || `[${word}]`);

    return translations.join(' ');
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
    
    try {
        // Google Apps Script APIが設定されている場合
        if (GAS_TRANSLATE_URL) {
            // 各行を個別に翻訳
            for (let index = 0; index < englishLines.length; index++) {
                const line = englishLines[index];
                if (line.trim()) {
                    const translation = await translateWithGoogleAPI(line.trim());
                    translationLines[index] = translation;
                } else {
                    translationLines[index] = '';
                }
            }
        } else {
            // フォールバック：従来の翻訳方法
            englishLines.forEach((line, index) => {
                if (line.trim()) {
                    const translation = translateToJapanese(line.trim(), true);
                    translationLines[index] = translation;
                } else {
                    translationLines[index] = '';
                }
            });
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
    }
});

// localStorage関連の関数
function getSavedSentences() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

function saveSentence(text) {
    if (!text.trim()) return false;
    
    const savedSentences = getSavedSentences();
    
    // 重複チェック
    if (savedSentences.some(item => item.text === text.trim())) {
        alert('この文は既に保存されています。');
        return false;
    }
    
    // 新しいアイテムを作成
    const newItem = {
        id: Date.now(),
        text: text.trim(),
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
        
        const textDiv = document.createElement('div');
        textDiv.className = 'sentence-text';
        textDiv.textContent = item.text;
        
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
        loadBtn.addEventListener('click', () => loadSavedSentence(item.text));
        
        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-button delete-action';
        deleteBtn.textContent = '❌';
        deleteBtn.addEventListener('click', () => deleteSavedSentenceById(item.id));
        
        actionsDiv.appendChild(speakBtn);
        actionsDiv.appendChild(loadBtn);
        actionsDiv.appendChild(deleteBtn);
        
        itemDiv.appendChild(textDiv);
        itemDiv.appendChild(actionsDiv);
        
        listContainer.appendChild(itemDiv);
    });
}

// 保存済み文を読み上げる関数
function speakSavedSentence(text) {
    speakEnglish(text, false, true);
}

// 保存済み文を入力エリアに読み込む関数
function loadSavedSentence(text) {
    englishInput.value = text;
    englishInput.focus();
    
    // 翻訳履歴をクリアして新しい翻訳を設定
    translationLines = [];
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        if (line.trim()) {
            const translation = translateToJapanese(line.trim(), true);
            translationLines[index] = translation;
        } else {
            translationLines[index] = '';
        }
    });
    updateTranslationDisplay();
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
    if (saveSentence(text)) {
        alert('保存しました！');
        displaySavedSentences(); // 一覧を更新
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
englishInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        // エンターキーが押される前に現在の行番号と行内容を取得
        const lineNumber = getCurrentLineNumber(englishInput);
        const currentLine = getCurrentLine(englishInput);
        
        if (currentLine.trim()) {
            // 現在行を文として発音のみ（翻訳は削除）
            speakEnglish(currentLine.trim(), false, true);
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