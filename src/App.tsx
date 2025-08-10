import './style.css'
import { AppProvider } from './contexts/AppContext'
import Header from './components/common/Header'
import NotebookContainer from './components/notebook/NotebookContainer'
import NotesList from './components/notes/NotesList'
import LoginModal from './components/common/LoginModal'
import Toast from './components/common/Toast'

function App() {
  return (
    <AppProvider>
      <div className="app">
        <Header />
        <LoginModal />
        <NotebookContainer />
        <NotesList />
        <Toast />
      </div>
    </AppProvider>
  )
}

export default App