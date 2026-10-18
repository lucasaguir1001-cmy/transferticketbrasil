import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function ImageUpload({
  value,
  onChange,
  folder = "events",
  guidance = "Imagem recomendada: 1600 × 900 px (proporção 16:9). JPG, PNG ou WebP · máximo 5 MB.",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  guidance?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB).");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Você precisa estar logado.");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("event-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("event-images")
        .createSignedUrl(path, TEN_YEARS);
      if (sErr || !signed) throw sErr ?? new Error("Falha ao gerar URL");
      onChange(signed.signedUrl);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Prévia"
            className="h-48 w-full rounded-xl border border-border object-cover"
          />
          <div className="absolute right-2 top-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Trocar
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => onChange("")}
              aria-label="Remover"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-48 w-full flex-col border-2 border-dashed bg-muted/30 text-muted-foreground hover:border-brand"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="font-medium">Clique para enviar uma imagem</span>
              <span className="text-xs">JPG, PNG ou WebP · máximo 5 MB</span>
            </>
          )}
        </Button>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">{guidance}</p>
    </div>
  );
}
