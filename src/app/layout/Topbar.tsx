import React from "react";
import { Link } from "react-router-dom";
import { pb } from "@/integrations/pocketbase/client";
import { useTranslation } from "react-i18next";
import { Menu, UserCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth";
import { useProfile } from "@/features/settings/hooks/useProfile";
import { useIsMobile } from "@/shared/hooks/useMobile";

interface TopbarProps {
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Topbar: React.FC<TopbarProps> = ({ setSidebarOpen }) => {
  const { t, i18n } = useTranslation(["navigation", "common"]);
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  const userDisplayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user?.email;

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="me-4"
            onClick={() => setSidebarOpen(true)}
            aria-label={t("common:openSidebar")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-semibold text-primary md:hidden"
        >
          <img
            src="/logo.svg"
            alt="Cost Estimator Logo"
            className="h-7 w-auto"
          />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="text-sm font-medium text-foreground"
          aria-label={t("common:switchLanguage")}
        >
          {i18n.language === "en"
            ? t("common:languageNameAr")
            : t("common:languageNameEn")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 w-12 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={
                    user?.avatar ? pb.files.getURL(user, user.avatar) : ""
                  }
                  alt={userDisplayName || "User"}
                />
                <AvatarFallback>
                  <UserCircle className="h-7 w-7 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userDisplayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                {t("navigation:settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="cursor-pointer"
            >
              {t("common:signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Topbar;
