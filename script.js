// DOM要素の取得
const englishInput = document.getElementById('english-input');
const speakButton = document.getElementById('speak-button');

// Web Speech APIの確認
if (!('speechSynthesis' in window)) {
    alert('お使いのブラウザは音声合成に対応していません。');
}

// 英語を発音する関数
function speakEnglish(text) {
    // 空文字の場合は処理しない
    if (!text.trim()) return;

    // 既存の発音をキャンセル
    window.speechSynthesis.cancel();

    // 発音の設定
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // アメリカ英語
    utterance.rate = 0.9; // 少しゆっくり目
    utterance.pitch = 1.0; // 標準のピッチ
    utterance.volume = 1.0; // 最大音量

    // 発音実行
    window.speechSynthesis.speak(utterance);
}

// ボタンクリックイベント
speakButton.addEventListener('click', () => {
    const text = englishInput.value;
    speakEnglish(text);
});

// エンターキーで自動発音
englishInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // フォームの送信を防ぐ
        const text = englishInput.value;
        speakEnglish(text);
    }
});