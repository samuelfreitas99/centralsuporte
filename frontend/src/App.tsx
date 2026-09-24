import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthenticatedView } from './components/AuthenticatedView';

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AuthenticatedView />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
