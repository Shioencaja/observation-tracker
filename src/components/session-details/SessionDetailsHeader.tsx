import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session } from "@/types/observation";

interface SessionDetailsHeaderProps {
  session: Session;
  onBack: () => void;
}

export function SessionDetailsHeader({
  session,
  onBack,
}: SessionDetailsHeaderProps) {
  return (
    <div className="mb-3 sm:mb-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="p-0 h-auto text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
        </Button>
        <div className="text-right min-w-0 flex-1 ml-2">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Detalles de sesión
          </p>
          <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
            {session.alias || session.id.substring(0, 8) || "Sesión"}
          </h1>
        </div>
      </div>
    </div>
  );
}

