import { useRouter } from "next/navigation";
import { Session } from "@/types/observation";
import { useMemo } from "react";

export function useSessionNavigation(
  allSessions: Session[],
  currentSessionId: string,
  projectId: string
) {
  const router = useRouter();

  const { currentIndex, hasPrevious, hasNext } = useMemo(() => {
    const index = allSessions.findIndex((s) => s.id === currentSessionId);
    return {
      currentIndex: index,
      hasPrevious: index > 0,
      hasNext: index < allSessions.length - 1,
    };
  }, [allSessions, currentSessionId]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const previousSession = allSessions[currentIndex - 1];
      router.push(`/${projectId}/sessions/${previousSession.id}`);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextSession = allSessions[currentIndex + 1];
      router.push(`/${projectId}/sessions/${nextSession.id}`);
    }
  };

  const handleBack = () => {
    router.push(`/${projectId}/sessions`);
  };

  return {
    currentIndex,
    hasPrevious,
    hasNext,
    handlePrevious,
    handleNext,
    handleBack,
  };
}

