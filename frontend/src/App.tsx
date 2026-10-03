import { MotionConfig } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthenticatedView } from './components/AuthenticatedView';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <ProtectedRoute>
                <AuthenticatedView />
              </ProtectedRoute>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}

export default App;

