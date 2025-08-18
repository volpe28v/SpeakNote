import './style.css'
import { useState, useEffect } from 'react'
import { AppProvider } from './contexts/AppContext'
import Header from './components/common/Header'
import NotebookContainer from './components/notebook/NotebookContainer'
import NotesList from './components/notes/NotesList'
import LoginModal from './components/common/LoginModal'
import Toast from './components/common/Toast'

function App() {
  const [activeTab, setActiveTab] = useState('notebook')

  // ノート選択時にNotebookタブに切り替える
  useEffect(() => {
    const handleNoteSelected = () => {
      setActiveTab('notebook')
    }

    window.addEventListener('noteSelected', handleNoteSelected)
    return () => {
      window.removeEventListener('noteSelected', handleNoteSelected)
    }
  }, [])

  return (
    <AppProvider>
      <div className="app">
        <Header />
        <LoginModal />
        <div className="tabs-container main-tabs">
          <div className="tabs-header">
            <button
              className={`tab-button ${activeTab === 'notebook' ? 'active' : ''}`}
              onClick={() => setActiveTab('notebook')}
            >
              Notebook
            </button>
            <button
              className={`tab-button ${activeTab === 'notes-list' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes-list')}
            >
              Index
            </button>
          </div>
          <div className="tab-content">
            {/* 両方のコンポーネントを常にマウントし、表示/非表示で切り替え */}
            <div style={{ display: activeTab === 'notebook' ? 'block' : 'none' }}>
              <NotebookContainer />
            </div>
            <div style={{ display: activeTab === 'notes-list' ? 'block' : 'none' }}>
              <NotesList />
            </div>
          </div>
        </div>
        <Toast />
      </div>
    </AppProvider>
  )
}

export default App
