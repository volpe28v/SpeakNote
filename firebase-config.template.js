// Firebase設定管理テンプレート
// デプロイ時に環境変数から実際の設定ファイルを生成します

// 開発環境用設定（プレースホルダー）
const devConfig = {
    apiKey: "__FIREBASE_API_KEY__",
    authDomain: "__FIREBASE_AUTH_DOMAIN__",
    projectId: "__FIREBASE_PROJECT_ID__",
    storageBucket: "__FIREBASE_STORAGE_BUCKET__",
    messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
    appId: "__FIREBASE_APP_ID__"
};

// 本番環境用設定（環境変数から読み込み）
const prodConfig = {
    apiKey: window.FIREBASE_API_KEY || devConfig.apiKey,
    authDomain: window.FIREBASE_AUTH_DOMAIN || devConfig.authDomain,
    projectId: window.FIREBASE_PROJECT_ID || devConfig.projectId,
    storageBucket: window.FIREBASE_STORAGE_BUCKET || devConfig.storageBucket,
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || devConfig.messagingSenderId,
    appId: window.FIREBASE_APP_ID || devConfig.appId
};

// 環境判定（localhost以外は本番とみなす）
const isProduction = !window.location.hostname.includes('localhost') && 
                    !window.location.hostname.includes('127.0.0.1');

// 使用する設定を決定
export const firebaseConfig = isProduction ? prodConfig : devConfig;

// デバッグ情報
console.log(`Firebase Config: ${isProduction ? 'Production' : 'Development'} mode`);