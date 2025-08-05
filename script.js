// DOM要素の取得
const englishInput = document.getElementById('english-input');
const speakButton = document.getElementById('speak-button');

// Web Speech APIの確認
if (!('speechSynthesis' in window)) {
    alert('お使いのブラウザは音声合成に対応していません。');
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

    // 発音の設定
    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.lang = 'en-US'; // アメリカ英語
    utterance.rate = 0.9; // 少しゆっくり目
    utterance.pitch = isQuestion ? 1.2 : 1.0; // 疑問文の場合は少し高めのピッチ
    utterance.volume = 1.0; // 最大音量

    // 発音実行
    window.speechSynthesis.speak(utterance);
}

// ボタンクリックイベント
speakButton.addEventListener('click', () => {
    const text = englishInput.value;
    speakEnglish(text);
});

// 直前の単語を取得する関数
function getLastWord(text) {
    const words = text.trim().split(/\s+/);
    return words[words.length - 1] || '';
}

// エンターキーで全文発音、スペースキーで直前の単語を発音、ピリオドで直前の一文を発音
englishInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // フォームの送信を防ぐ
        const text = englishInput.value;
        speakEnglish(text); // 全文を発音
    } else if (event.key === ' ') {
        // スペースキーが押されたら直前の単語を発音
        const text = englishInput.value;
        
        // 句読点の直後かどうかをチェック
        const lastChar = text.slice(-1);
        const isPunctuationBefore = /[.!?]/.test(lastChar);
        
        if (!isPunctuationBefore) {
            const lastWord = getLastWord(text);
            if (lastWord) {
                speakEnglish(lastWord); // 直前の単語のみを発音
            }
        }
        // スペースは通常通り入力される
    } else if (event.key === '.' || event.key === '?' || event.key === '!') {
        // ピリオド、疑問符、感嘆符が押されたら、入力後に一文を発音
        const punctuation = event.key;
        setTimeout(() => {
            const text = englishInput.value;
            // 最後の文を取得（最後の句読点まで内容）
            const sentences = text.split(/[.!?]+/);
            const lastSentence = sentences[sentences.length - 2] || sentences[sentences.length - 1];
            if (lastSentence && lastSentence.trim()) {
                // 疑問符の場合は疑問文として発音
                const isQuestion = punctuation === '?';
                speakEnglish(lastSentence.trim(), isQuestion);
            }
        }, 50); // 少し遅延させて句読点が入力されるのを待つ
    }
});