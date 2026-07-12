import { useEffect, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/layout/AppLayout';
import Home from './pages/Home';
import Orders from './pages/Orders';
import AutoImport from './pages/AutoImport';
import OrderDetail from './pages/OrderDetail';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import NewOrder from './pages/NewOrder';
import Customers from './pages/Customers';
import AgentHub from './pages/AgentHub';
import AgentChat from './components/AgentChat';
import MenuPage from './pages/MenuPage';
import LandingPage from './pages/LandingPage';

// REQUIRED — copy verbatim per Clerk setup instructions
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside',
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#7C3AED',
    colorForeground: '#1a1523',
    colorMutedForeground: '#6b6b8a',
    colorDanger: '#dc2626',
    colorBackground: '#faf9ff',
    colorInput: '#f0eeff',
    colorInputForeground: '#1a1523',
    colorNeutral: '#e5e4f0',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-purple-100',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#1a1523] font-bold',
    headerSubtitle: 'text-[#6b6b8a]',
    socialButtonsBlockButtonText: 'text-[#1a1523] font-medium',
    formFieldLabel: 'text-[#1a1523] font-medium',
    footerActionLink: 'text-[#7C3AED] font-semibold',
    footerActionText: 'text-[#6b6b8a]',
    dividerText: 'text-[#6b6b8a]',
    identityPreviewEditButton: 'text-[#7C3AED]',
    formFieldSuccessText: 'text-green-600',
    alertText: 'text-[#1a1523]',
    logoBox: 'mb-2',
    logoImage: 'h-10 w-10',
    socialButtonsBlockButton: 'border border-purple-100 hover:bg-purple-50',
    formButtonPrimary: 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold',
    formFieldInput: 'bg-[#f0eeff] border-purple-100 text-[#1a1523]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-purple-100',
    alert: 'bg-red-50 border border-red-200',
    otpCodeFieldInput: 'bg-[#f0eeff] border-purple-200',
    formFieldRow: '',
    main: '',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold text-[#1a1523]">Sweet Tooth</h1>
          <p className="text-sm text-[#6b6b8a] mt-1">Home Baker Dashboard</p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold text-[#1a1523]">Sweet Tooth</h1>
          <p className="text-sm text-[#6b6b8a] mt-1">Create your baker account</p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

// Invalidates TanStack Query cache when the signed-in user changes
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

// Protected wrapper: redirects signed-out users to the landing page
function SignedOutRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`${basePath}/`, { replace: true });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><SignedOutRedirect /></Show>
    </>
  );
}

function AppWithClerk() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: 'Sign in to Sweet Tooth',
            subtitle: 'Welcome back, baker! 🧁',
          },
        },
        signUp: {
          start: {
            title: 'Join Sweet Tooth',
            subtitle: 'Start managing your bakery with AI 🎂',
          },
        },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignInUrl={`${basePath}/dashboard`}
      afterSignUpUrl={`${basePath}/dashboard`}
      routerPush={(to) => navigate(stripBase(to))}
      routerReplace={(to) => navigate(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClientInstance}>
        <ClerkQueryClientCacheInvalidator />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/shop/:userId" element={<MenuPage />} />
          <Route path="/orders/new" element={<ProtectedRoute><NewOrder /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/auto-import" element={<AutoImport />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/agent" element={<AgentHub />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <AgentChat />
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <Router>
      <AppWithClerk />
    </Router>
  );
}

export default App;
