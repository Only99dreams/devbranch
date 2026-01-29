import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PWAInstallBanner() {
  const { isInstallable, installPWA } = usePWAInstall();

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await installPWA();
      return;
    }

    // Open non-blocking dialog with instructions
    setDialogOpen(true);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-4">
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
              onClick={handleInstallClick}
              size="sm"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install the App</DialogTitle>
            <DialogDescription>
              Follow the steps below to install the app on your device.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div>
              <p className="font-semibold">Android / Desktop (Chrome, Edge)</p>
              <p className="text-sm text-muted-foreground">Open the browser menu and choose "Install app" or "Add to Home screen".</p>
            </div>
            <div>
              <p className="font-semibold">iOS (Safari)</p>
              <p className="text-sm text-muted-foreground">Tap the Share button and choose "Add to Home Screen".</p>
            </div>
            <div>
              <p className="font-semibold">If the browser supports install</p>
              <p className="text-sm text-muted-foreground">When available, use the "Install" button in the banner to trigger the installer.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <Button onClick={() => setDialogOpen(false)} variant="ghost">Close</Button>
            {isInstallable ? (
              <Button
                onClick={async () => {
                  await installPWA();
                  setDialogOpen(false);
                }}
                className="bg-blue-600 text-white"
              >
                Install
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}