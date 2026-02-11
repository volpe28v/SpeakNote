import { useApp } from '@/contexts/AppContext'

function LoginModal() {
  const { auth } = useApp()
  const { user, login } = auth

  if (user) {
    return null
  }

  return (
    <div id="login-required-message" className="login-required-message">
      <div className="login-prompt">
        <h3>🔐 Login Required</h3>
        <p>Please sign in with your Google account to use SpeakNote</p>
        <button id="login-prompt-button" className="login-prompt-button" onClick={login}>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

export default LoginModal
