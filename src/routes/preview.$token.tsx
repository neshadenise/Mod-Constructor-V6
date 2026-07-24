import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PREVIEW_UNLOCK_TOKEN, PREVIEW_UNLOCK_STORAGE_KEY } from "@/lib/app-mode";

export const Route = createFileRoute("/preview/$token")({
  component: PreviewUnlock,
});

function PreviewUnlock() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (token === PREVIEW_UNLOCK_TOKEN) {
      try {
        window.localStorage.setItem(PREVIEW_UNLOCK_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    navigate({ to: "/", replace: true });
  }, [token, navigate]);

  return null;
}
