import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthenticatedView } from './components/AuthenticatedView';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProtectedRoute>
          <AuthenticatedView />
        </ProtectedRoute>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
