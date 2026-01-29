import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallBanner() {
  const { isInstallable, installPWA } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-4 relative">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6" />
          <div>
            <p className="font-semibold text-sm md:text-base">Install Our App</p>
            <p className="text-xs md:text-sm opacity-90">Get offline access and push notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={installPWA}
            size="sm"
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Install
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}