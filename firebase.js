// Firebase設定とSDKの初期化
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase初期化
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google認証プロバイダー
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// 認証機能
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signOutUser = () => signOut(auth);

// 認証状態管理クラス
export class AuthManager {
    constructor() {
        this.user = null;
        this.callbacks = [];
    }

    // 認証状態の監視を開始
    init() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, (user) => {
                this.user = user;
                this.callbacks.forEach(callback => callback(user));
                resolve(user);
            });
        });
    }

    // 認証状態の変更をリスナーに通知
    onAuthStateChanged(callback) {
        this.callbacks.push(callback);
        // 既に認証状態が確定していれば即座にコールバック実行
        if (this.user !== null) {
            callback(this.user);
        }
    }

    // 現在のユーザーを取得
    getCurrentUser() {
        return this.user;
    }

    // ログイン処理
    async signIn() {
        try {
            const result = await signInWithGoogle();
            Toast.success(`${result.user.displayName}さん、ようこそ！`);
            return result.user;
        } catch (error) {
            console.error('ログインエラー:', error);
            Toast.error('ログインに失敗しました');
            throw error;
        }
    }

    // ログアウト処理
    async signOut() {
        if (confirm('ログアウトしますか？')) {
            try {
                await signOutUser();
                Toast.info('ログアウトしました');
            } catch (error) {
                console.error('ログアウトエラー:', error);
                Toast.error('ログアウトに失敗しました');
            }
        }
    }
}

// Firestore操作クラス
export class FirestoreManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    // ユーザーのノートコレクションの参照を取得
    getUserNotesCollection(userId) {
        return collection(db, 'users', userId, 'notes');
    }

    // ノートをFirestoreに保存
    async saveNote(note) {
        const user = this.authManager.getCurrentUser();
        if (!user) {
            throw new Error('ログインが必要です');
        }

        try {
            const noteRef = doc(this.getUserNotesCollection(user.uid), note.id.toString());
            await setDoc(noteRef, {
                english: note.text,
                translations: note.translations || [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Firestore保存エラー:', error);
            throw error;
        }
    }

    // ノートをFirestoreで更新
    async updateNote(note) {
        const user = this.authManager.getCurrentUser();
        if (!user) {
            throw new Error('ログインが必要です');
        }

        try {
            const noteRef = doc(this.getUserNotesCollection(user.uid), note.id.toString());
            await updateDoc(noteRef, {
                english: note.text,
                translations: note.translations || [],
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Firestore更新エラー:', error);
            throw error;
        }
    }

    // ノートをFirestoreから削除
    async deleteNote(noteId) {
        const user = this.authManager.getCurrentUser();
        if (!user) {
            throw new Error('ログインが必要です');
        }

        try {
            const noteRef = doc(this.getUserNotesCollection(user.uid), noteId.toString());
            await deleteDoc(noteRef);
        } catch (error) {
            console.error('Firestore削除エラー:', error);
            throw error;
        }
    }

    // ユーザーの全ノートを取得
    async getUserNotes() {
        const user = this.authManager.getCurrentUser();
        if (!user) {
            return [];
        }

        try {
            const q = query(
                this.getUserNotesCollection(user.uid),
                orderBy('updatedAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            const notes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                notes.push({
                    id: parseInt(doc.id),
                    text: data.english,
                    translations: data.translations || [],
                    timestamp: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString()
                });
            });
            
            return notes;
        } catch (error) {
            console.error('Firestore取得エラー:', error);
            throw error;
        }
    }

    // ローカルストレージからFirestoreに移行
    async migrateFromLocalStorage() {
        const user = this.authManager.getCurrentUser();
        if (!user) {
            return;
        }

        const localNotes = JSON.parse(localStorage.getItem('speakNote_savedSentences') || '[]');
        if (localNotes.length === 0) {
            return;
        }

        try {
            for (const note of localNotes) {
                await this.saveNote(note);
            }
            Toast.success(`${localNotes.length}件のノートをクラウドに移行しました`);
        } catch (error) {
            console.error('移行エラー:', error);
            Toast.error('ノートの移行に失敗しました');
        }
    }
}