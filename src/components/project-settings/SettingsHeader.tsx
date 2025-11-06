"use client";

import { ArrowLeft, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsHeaderProps {
  projectName: string;
  userEmail: string;
  onBack: () => void;
  onSignOut: () => void;
}

export function SettingsHeader({
  projectName,
  userEmail,
  onBack,
  onSignOut,
}: SettingsHeaderProps) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="flex h-12 sm:h-14 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
            >
              <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Proyectos</span>
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-semibold">
                Configuración del Proyecto
              </h1>
              <p className="text-xs text-muted-foreground truncate max-w-32 sm:max-w-none">
                {projectName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User size={16} />
              <span className="max-w-32 truncate">{userEmail}</span>
            </div>
            <Button
              onClick={onSignOut}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
            >
              <LogOut size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

