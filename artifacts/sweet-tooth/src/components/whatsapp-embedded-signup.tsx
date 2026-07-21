import { useCallback, useEffect, useRef, useState } from "react";
import { customFetch } from "@workspace/api-client-react";

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

type EmbeddedSignupSession = {
  phone_number_id?: string;
  waba_id?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type ConnectionStatus = {
  whatsapp: {
    connected: boolean;
    phoneNumberId: string | null;
    wabaId: string | null;
  };
};

export function WhatsAppEmbeddedSignup() {
  const appId = import.meta.env.VITE_META_APP_ID;
  const configId = import.meta.env.VITE_META_CONFIG_ID;
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<string | null>(null);
  const sessionRef = useRef<EmbeddedSignupSession | null>(null);

  const refreshStatus = useCallback(async () => {
    const status = await customFetch<ConnectionStatus>("/api/meta/connections", {
      responseType: "json",
    });
    setConnected(status.whatsapp.connected);
  }, []);

  useEffect(() => {
    void refreshStatus().catch(() => undefined);
  }, [refreshStatus]);

  const completeWhenReady = useCallback(async () => {
    const code = codeRef.current;
    const session = sessionRef.current;
    if (!code || !session?.waba_id || !session.phone_number_id) return;

    // The exchange code expires in 30 seconds, so complete immediately.
    codeRef.current = null;
    sessionRef.current = null;
    try {
      await customFetch("/api/meta/whatsapp/complete", {
        method: "POST",
        responseType: "json",
        body: JSON.stringify({
          code,
          wabaId: session.waba_id,
          phoneNumberId: session.phone_number_id,
        }),
      });
      setConnected(true);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "WhatsApp connection failed.");
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    if (!appId) return;
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
      setSdkReady(true);
    };

    if (window.FB) {
      window.fbAsyncInit();
      return;
    }
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(script);
    }
  }, [appId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let originHost: string;
      try {
        originHost = new URL(event.origin).hostname;
      } catch {
        return;
      }
      if (originHost !== "facebook.com" && !originHost.endsWith(".facebook.com")) return;

      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (
          payload?.type === "WA_EMBEDDED_SIGNUP" &&
          typeof payload.event === "string" &&
          payload.event.startsWith("FINISH")
        ) {
          sessionRef.current = payload.data ?? null;
          void completeWhenReady();
        } else if (payload?.type === "WA_EMBEDDED_SIGNUP" && payload?.event === "CANCEL") {
          setConnecting(false);
        }
      } catch {
        // Ignore unrelated cross-window messages.
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [completeWhenReady]);

  const launch = () => {
    if (!window.FB || !configId) return;
    setConnecting(true);
    setError(null);
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setConnecting(false);
          setError("Meta sign-up was cancelled or did not return an authorization code.");
          return;
        }
        codeRef.current = code;
        void completeWhenReady();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      },
    );
  };

  if (!appId || !configId) {
    return (
      <p className="text-sm text-amber-700">
        Add VITE_META_APP_ID and VITE_META_CONFIG_ID to enable Embedded Signup.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border px-4 py-3 text-sm ${connected ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-muted/30 text-muted-foreground"}`}>
        {connected ? "WhatsApp Business is securely connected." : "No WhatsApp Business account connected yet."}
      </div>
      <button
        type="button"
        onClick={launch}
        disabled={!sdkReady || connecting}
        className="rounded-lg bg-[#1877f2] px-5 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {connecting ? "Connecting…" : connected ? "Reconnect WhatsApp" : "Connect WhatsApp Business"}
      </button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
