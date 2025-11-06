"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OptimizedImage } from "@/components/OptimizedImage";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogoClick = () => {
    router.push("/");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              title="Ir al inicio"
            >
              <OptimizedImage
                src="/lg_container_light.svg"
                alt="Observaciones BCP"
                width={120}
                height={49}
                priority
                sizes="(max-width: 768px) 120px, 120px"
                className="h-8 w-auto"
              />
            </button>
          </div>

          {/* Profile Dropdown */}
          <div className="flex items-center">
            {user ? (
              <DropdownMenu
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full hover:bg-muted"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
                        alt={user.email || "User"}
                      />
                      <AvatarFallback className="text-xs">
                        {user.email ? getInitials(user.email) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground">Usuario</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
