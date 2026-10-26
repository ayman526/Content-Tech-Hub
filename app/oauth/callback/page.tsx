"use client";

import { useEffect, useState } from "react";

export default function OAuthCallback() {
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");

  useEffect(() => {
    try {
      // Token arrives in the URL hash for implicit flow (response_type=token)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get("access_token");

      // Provider is encoded in the `state` query param
      const search = new URLSearchParams(window.location.search);
      const provider = search.get("state") ?? params.get("state") ?? "";

      if (token && window.opener) {
        window.opener.postMessage(
          { type: "contentech_oauth_token", token, provider },
          window.location.origin
        );
        setStatus("done");
        window.close();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F5F8FA] font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-10 flex flex-col items-center gap-4 max-w-sm text-center">
        {status === "processing" && (
          <>
            <div className="w-10 h-10 rounded-full border-4 border-[#0091AE] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Connecting your account…</p>
          </>
        )}
        {status === "done" && (
          <>
            <div className="text-[#00BDA5] text-4xl">&#10003;</div>
            <p className="text-sm text-gray-600 font-medium">Connected. You can close this window.</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-sm text-red-500 font-medium">Something went wrong. Please close this window and try again.</p>
          </>
        )}
      </div>
    </div>
  );
}
