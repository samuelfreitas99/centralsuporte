import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthenticatedView } from './components/AuthenticatedView';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ProtectedRoute>
            <AuthenticatedView />
          </ProtectedRoute>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
