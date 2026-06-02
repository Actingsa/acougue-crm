import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard/Topbar";

export const Route = createFileRoute("/_authenticated/hardware")({
  component: HardwarePage,
  head: () => ({ meta: [{ title: "Hardware · Carne.CRM" }] }),
});

type HW = {
  id?: string;
  company_id: string;
  barcode_enabled: boolean;
  barcode_mode: string;
  barcode_prefix: string;
  barcode_suffix: string;
  barcode_min_length: number;
  barcode_max_length: number;
  barcode_serial_port: string | null;
  barcode_serial_baud: number | null;
  barcode_weight_pattern: string | null;
  printer_enabled: boolean;
  printer_brand: string;
  printer_model: string | null;
  printer_connection: string;
  printer_serial_port: string | null;
  printer_serial_baud: number | null;
  printer_ip: string | null;
  printer_port: number | null;
  printer_paper_width: number;
  printer_auto_cut: boolean;
  printer_cash_drawer: boolean;
  printer_copies: number;
  printer_header: string | null;
  printer_footer: string | null;
  sat_enabled: boolean;
  sat_activation_code: string | null;
  sat_cnpj: string | null;
  nfce_enabled: boolean;
  nfce_environment: string | null;
  nfce_csc_id: string | null;
  nfce_csc_token: string | null;
};

const empty = (cid: string): HW => ({
  company_id: cid,
  barcode_enabled: true,
  barcode_mode: "keyboard",
  barcode_prefix: "",
  barcode_suffix: "Enter",
  barcode_min_length: 6,
  barcode_max_length: 48,
  barcode_serial_port: "",
  barcode_serial_baud: 9600,
  barcode_weight_pattern: "2NNNNNWWWWWC",
  printer_enabled: false,
  printer_brand: "bematech",
  printer_model: "MP-4200 TH",
  printer_connection: "usb",
  printer_serial_port: "COM1",
  printer_serial_baud: 9600,
  printer_ip: "",
  printer_port: 9100,
  printer_paper_width: 80,
  printer_auto_cut: true,
  printer_cash_drawer: false,
  printer_copies: 1,
  printer_header: "",
  printer_footer: "Obrigado pela preferência!",
  sat_enabled: false,
  sat_activation_code: "",
  sat_cnpj: "",
  nfce_enabled: false,
  nfce_environment: "homolog",
  nfce_csc_id: "",
  nfce_csc_token: "",
});

const PRINTER_MODELS: Record<string, string[]> = {
  bematech: ["MP-4200 TH", "MP-2500 TH", "MP-100S TH"],
  epson: ["TM-T20X", "TM-T88VI", "TM-M30"],
  daruma: ["DR800", "DR700", "DR2500"],
  elgin: ["i9", "i7", "VOX+"],
  sweda: ["SI-300", "SI-150"],
  generic_escpos: ["Genérica ESC/POS 80mm", "Genérica ESC/POS 58mm"],
};

function HardwarePage() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [hw, setHw] = useState<HW | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hardware", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hardware_settings")
        .select("*")
        .eq("company_id", company!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as HW | null) ?? empty(company!.id);
    },
  });

  useEffect(() => {
    if (data) setHw(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!hw || !company) throw new Error("Sem empresa");
      const payload = { ...hw, company_id: company.id };
      const { error } = await supabase
        .from("hardware_settings")
        .upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações de hardware salvas");
      qc.invalidateQueries({ queryKey: ["hardware"] });
    },
    onError: (e: Error) =>
      toast.error("Falha ao salvar", { description: e.message }),
  });

  if (isLoading || !hw) {
    return (
      <>
        <DashboardTopbar title="Hardware & Periféricos" />
        <div className="p-8 font-mono text-xs text-muted-foreground">
          Carregando…
        </div>
      </>
    );
  }

  const set = <K extends keyof HW>(k: K, v: HW[K]) =>
    setHw((h) => (h ? { ...h, [k]: v } : h));

  return (
    <>
      <DashboardTopbar title="Hardware & Periféricos" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <header>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
              Configuração de hardware
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tighter">
              Leitor de Código de Barras & Impressora Fiscal
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Parâmetros aplicados a todos os terminais PDV desta empresa.
              Compatível com os principais modelos do mercado brasileiro.
            </p>
          </header>

          {/* Barcode reader */}
          <section className="border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  01 — Periférico
                </div>
                <h2 className="text-lg font-bold uppercase tracking-tighter">
                  Leitor de código de barras
                </h2>
              </div>
              <Toggle
                checked={hw.barcode_enabled}
                onChange={(v) => set("barcode_enabled", v)}
                label="Ativo"
              />
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Modo de conexão">
                <Select
                  value={hw.barcode_mode}
                  onChange={(v) => set("barcode_mode", v)}
                  options={[
                    ["keyboard", "USB (emulação de teclado)"],
                    ["serial", "Serial / COM"],
                    ["bluetooth", "Bluetooth HID"],
                  ]}
                />
              </Field>
              <Field label="Sufixo do scanner">
                <Select
                  value={hw.barcode_suffix}
                  onChange={(v) => set("barcode_suffix", v)}
                  options={[
                    ["Enter", "Enter (CR)"],
                    ["Tab", "Tab"],
                    ["None", "Nenhum"],
                  ]}
                />
              </Field>
              <Field label="Prefixo (opcional)">
                <Input
                  value={hw.barcode_prefix}
                  onChange={(v) => set("barcode_prefix", v)}
                  placeholder="Ex: $"
                />
              </Field>
              <Field label="Padrão de balança (EAN-13)">
                <Input
                  value={hw.barcode_weight_pattern ?? ""}
                  onChange={(v) => set("barcode_weight_pattern", v)}
                  placeholder="2NNNNNWWWWWC"
                />
              </Field>
              <Field label="Tamanho mínimo">
                <Input
                  type="number"
                  value={String(hw.barcode_min_length)}
                  onChange={(v) => set("barcode_min_length", Number(v) || 0)}
                />
              </Field>
              <Field label="Tamanho máximo">
                <Input
                  type="number"
                  value={String(hw.barcode_max_length)}
                  onChange={(v) => set("barcode_max_length", Number(v) || 0)}
                />
              </Field>
              {hw.barcode_mode === "serial" && (
                <>
                  <Field label="Porta serial">
                    <Input
                      value={hw.barcode_serial_port ?? ""}
                      onChange={(v) => set("barcode_serial_port", v)}
                      placeholder="COM3 / /dev/ttyUSB0"
                    />
                  </Field>
                  <Field label="Baud rate">
                    <Input
                      type="number"
                      value={String(hw.barcode_serial_baud ?? 9600)}
                      onChange={(v) =>
                        set("barcode_serial_baud", Number(v) || 9600)
                      }
                    />
                  </Field>
                </>
              )}
            </div>
          </section>

          {/* Printer */}
          <section className="border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  02 — Impressora
                </div>
                <h2 className="text-lg font-bold uppercase tracking-tighter">
                  Impressora fiscal / Cupom
                </h2>
              </div>
              <Toggle
                checked={hw.printer_enabled}
                onChange={(v) => set("printer_enabled", v)}
                label="Ativa"
              />
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Fabricante">
                <Select
                  value={hw.printer_brand}
                  onChange={(v) => {
                    set("printer_brand", v);
                    set("printer_model", PRINTER_MODELS[v]?.[0] ?? null);
                  }}
                  options={[
                    ["bematech", "Bematech"],
                    ["epson", "Epson"],
                    ["daruma", "Daruma"],
                    ["elgin", "Elgin"],
                    ["sweda", "Sweda"],
                    ["generic_escpos", "Genérica ESC/POS"],
                  ]}
                />
              </Field>
              <Field label="Modelo">
                <Select
                  value={hw.printer_model ?? ""}
                  onChange={(v) => set("printer_model", v)}
                  options={(PRINTER_MODELS[hw.printer_brand] ?? []).map((m) => [
                    m,
                    m,
                  ])}
                />
              </Field>
              <Field label="Conexão">
                <Select
                  value={hw.printer_connection}
                  onChange={(v) => set("printer_connection", v)}
                  options={[
                    ["usb", "USB"],
                    ["serial", "Serial / COM"],
                    ["ethernet", "Rede / Ethernet"],
                    ["bluetooth", "Bluetooth"],
                  ]}
                />
              </Field>
              <Field label="Largura do papel">
                <Select
                  value={String(hw.printer_paper_width)}
                  onChange={(v) => set("printer_paper_width", Number(v))}
                  options={[
                    ["80", "80 mm"],
                    ["58", "58 mm"],
                  ]}
                />
              </Field>

              {hw.printer_connection === "serial" && (
                <>
                  <Field label="Porta serial">
                    <Input
                      value={hw.printer_serial_port ?? ""}
                      onChange={(v) => set("printer_serial_port", v)}
                      placeholder="COM1 / /dev/ttyS0"
                    />
                  </Field>
                  <Field label="Baud rate">
                    <Input
                      type="number"
                      value={String(hw.printer_serial_baud ?? 9600)}
                      onChange={(v) =>
                        set("printer_serial_baud", Number(v) || 9600)
                      }
                    />
                  </Field>
                </>
              )}
              {hw.printer_connection === "ethernet" && (
                <>
                  <Field label="Endereço IP">
                    <Input
                      value={hw.printer_ip ?? ""}
                      onChange={(v) => set("printer_ip", v)}
                      placeholder="192.168.0.50"
                    />
                  </Field>
                  <Field label="Porta TCP">
                    <Input
                      type="number"
                      value={String(hw.printer_port ?? 9100)}
                      onChange={(v) => set("printer_port", Number(v) || 9100)}
                    />
                  </Field>
                </>
              )}

              <Field label="Cópias do cupom">
                <Input
                  type="number"
                  value={String(hw.printer_copies)}
                  onChange={(v) => set("printer_copies", Number(v) || 1)}
                />
              </Field>
              <div className="flex flex-col gap-3">
                <Toggle
                  checked={hw.printer_auto_cut}
                  onChange={(v) => set("printer_auto_cut", v)}
                  label="Corte automático"
                />
                <Toggle
                  checked={hw.printer_cash_drawer}
                  onChange={(v) => set("printer_cash_drawer", v)}
                  label="Abrir gaveta de dinheiro"
                />
              </div>

              <Field label="Cabeçalho do cupom" wide>
                <textarea
                  value={hw.printer_header ?? ""}
                  onChange={(e) => set("printer_header", e.target.value)}
                  rows={2}
                  className="w-full border border-border bg-background p-2 font-mono text-xs outline-none focus:border-primary"
                />
              </Field>
              <Field label="Rodapé do cupom" wide>
                <textarea
                  value={hw.printer_footer ?? ""}
                  onChange={(e) => set("printer_footer", e.target.value)}
                  rows={2}
                  className="w-full border border-border bg-background p-2 font-mono text-xs outline-none focus:border-primary"
                />
              </Field>
            </div>
          </section>

          {/* SAT / NFC-e */}
          <section className="border border-border bg-surface">
            <header className="border-b border-border p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                03 — Fiscal
              </div>
              <h2 className="text-lg font-bold uppercase tracking-tighter">
                SAT-CF-e & NFC-e (Brasil)
              </h2>
            </header>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Toggle
                  checked={hw.sat_enabled}
                  onChange={(v) => set("sat_enabled", v)}
                  label="Habilitar SAT-CF-e"
                />
              </div>
              {hw.sat_enabled && (
                <>
                  <Field label="CNPJ do contribuinte">
                    <Input
                      value={hw.sat_cnpj ?? ""}
                      onChange={(v) => set("sat_cnpj", v)}
                      placeholder="00.000.000/0000-00"
                    />
                  </Field>
                  <Field label="Código de ativação SAT">
                    <Input
                      type="password"
                      value={hw.sat_activation_code ?? ""}
                      onChange={(v) => set("sat_activation_code", v)}
                    />
                  </Field>
                </>
              )}

              <div className="md:col-span-2 border-t border-border pt-4">
                <Toggle
                  checked={hw.nfce_enabled}
                  onChange={(v) => set("nfce_enabled", v)}
                  label="Habilitar NFC-e"
                />
              </div>
              {hw.nfce_enabled && (
                <>
                  <Field label="Ambiente">
                    <Select
                      value={hw.nfce_environment ?? "homolog"}
                      onChange={(v) => set("nfce_environment", v)}
                      options={[
                        ["homolog", "Homologação"],
                        ["production", "Produção"],
                      ]}
                    />
                  </Field>
                  <Field label="CSC ID (idToken)">
                    <Input
                      value={hw.nfce_csc_id ?? ""}
                      onChange={(v) => set("nfce_csc_id", v)}
                    />
                  </Field>
                  <Field label="CSC Token" wide>
                    <Input
                      type="password"
                      value={hw.nfce_csc_token ?? ""}
                      onChange={(v) => set("nfce_csc_token", v)}
                    />
                  </Field>
                </>
              )}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pb-12">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="bg-primary px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {save.isPending ? "Salvando…" : "Salvar configurações"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={"flex flex-col gap-2 " + (wide ? "md:col-span-2" : "")}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        "flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors " +
        (checked
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-white/5")
      }
    >
      <span
        className={
          "h-2 w-2 rounded-full " + (checked ? "bg-primary" : "bg-muted")
        }
      />
      {label}
    </button>
  );
}
