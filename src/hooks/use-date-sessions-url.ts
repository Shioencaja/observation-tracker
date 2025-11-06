import { useSearchParams, useParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook to manage URL state for date sessions page
 */
export function useDateSessionsUrl() {
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.projectId as string;
  const selectedDate = params.date as string;

  const sessionFromUrl = searchParams.get("session");
  const agencyFromUrl = searchParams.get("agency");

  const updateUrlWithSession = useCallback(
    (sessionId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (sessionId) {
        params.set("session", sessionId);
      } else {
        params.delete("session");
      }

      const newUrl = `/${projectId}/${selectedDate}/sessions?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    },
    [searchParams, projectId, selectedDate]
  );

  const updateUrlWithAgency = useCallback(
    (agency: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (agency) {
        params.set("agency", agency);
      } else {
        params.delete("agency");
      }

      const newUrl = `/${projectId}/${selectedDate}/sessions?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    },
    [searchParams, projectId, selectedDate]
  );

  return {
    sessionFromUrl,
    agencyFromUrl,
    updateUrlWithSession,
    updateUrlWithAgency,
  };
}

