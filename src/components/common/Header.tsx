import { useApp } from '../../contexts/AppContext'

function Header() {
  const { auth } = useApp()
  const { user, login, logout } = auth

  return (
    <div className="header">
      <h1>SpeakNote</h1>
      <div className="header-right">
        <span className="version">ver1.2.2</span>
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
