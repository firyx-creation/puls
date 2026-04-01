import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import Feed from './pages/Feed';
import Setup from './pages/Setup';
import Compose from './pages/Compose';
import Settings from './pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-black tracking-tight">
            puls<span className="text-primary">.</span>
          </h1>
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (authError || !isAuthenticated) {
    return <PageNotFound />;
  }

  return (
    <Routes>
      <Route path="/" element={<Feed />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/compose" element={<Compose />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" theme="dark" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App