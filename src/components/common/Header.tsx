import { useApp } from '@/contexts/AppContext'
import { APP_VERSION } from '@/constants/appConstants'

function Header() {
  const { auth } = useApp()
  const { user, login, logout } = auth

  return (
    <div className="header">
      <h1>SpeakNote</h1>
      <div className="header-right">
        <span className="version">ver{APP_VERSION}</span>
        <div id="auth-container">
          {user ? (
            <div id="user-info" className="user-info">
              <img id="user-avatar" className="user-avatar" src={user.photoURL || ''} alt="" />
              <span id="user-name" className="user-name">
                {user.displayName || 'User'}
              </span>
              <button id="logout-button" className="auth-button logout" onClick={logout}>
                Sign Out
              </button>
            </div>
          ) : (
            <button id="login-button" className="auth-button" onClick={login}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header
