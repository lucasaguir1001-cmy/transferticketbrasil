import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Smartphone, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-config";

type CheckinShareButtonProps = {
  eventId: string;
  eventTitle?: string | null;
  className?: string;
  compact?: boolean;
};

export function CheckinShareButton({
  eventId,
  eventTitle,
  className,
  compact = false,
}: CheckinShareButtonProps) {
  const path = `/checkin/${eventId}`;
  const [checkinUrl, setCheckinUrl] = useState(path);

  useEffect(() => {
    const host = window.location.hostname;
    const isPreview =
      host.includes("id-preview--") ||
      host.endsWith("lovable.dev");
    const origin = isPreview ? getSiteUrl() : window.location.origin;
    setCheckinUrl(`${origin}${path}`);
  }, [path]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      toast.success("Link da portaria copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check-in — TTB", url: checkinUrl });
        return;
      }
      await copyLink();
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* The button is hidden as per user request to remove "Abrir no celular" buttons */}
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          className={cn(
            "rounded-full bg-gradient-brand font-semibold text-brand-foreground shadow-glow hidden",
            compact ? "px-3" : "px-4",
            className,
          )}
        >
          <Share2 className="h-3.5 w-3.5" /> Abrir no celular
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl border-border bg-card p-5">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Abrir validador no celular</DialogTitle>
          <DialogDescription>
            Escaneie este QR Code com o celular da portaria ou copie o link abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto rounded-2xl border border-border bg-background p-4">
          <QRCodeSVG value={checkinUrl} size={210} includeMargin />
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-center font-mono text-xs text-muted-foreground">
          <p className="truncate">{checkinUrl}</p>
        </div>

        {eventTitle ? (
          <p className="text-center text-xs font-medium text-muted-foreground">
            {eventTitle}
          </p>
        ) : null}

        <div className="grid gap-2">
          <Button type="button" onClick={shareLink} className="rounded-xl bg-gradient-brand text-brand-foreground">
            <Smartphone className="h-4 w-4" /> Enviar para o celular
          </Button>
          <Button type="button" variant="outline" onClick={copyLink} className="rounded-xl">
            <Copy className="h-4 w-4" /> Copiar link
          </Button>
          <Button asChild type="button" variant="secondary" className="rounded-xl">
            <Link to="/checkin/$id" params={{ id: eventId }}>
              <QrCode className="h-4 w-4" /> Abrir validador neste aparelho
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}