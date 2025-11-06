import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionNavigationProps {
  currentIndex: number;
  totalSessions: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function SessionNavigation({
  currentIndex,
  totalSessions,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: SessionNavigationProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
      >
        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
      <span className="text-xs sm:text-sm text-muted-foreground min-w-[40px] sm:min-w-[60px] text-center">
        {currentIndex + 1}/{totalSessions}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
      >
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
}

