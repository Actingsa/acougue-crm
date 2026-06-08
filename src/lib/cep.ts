import { useState } from "react";
import { toast } from "sonner";

export function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

export function formatCep(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export type ViaCepAddress = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento?: string;
  erro?: boolean | "true";
};

type BrasilApiCepAddress = {
  cep: string;
  state: string;
  city: string;
  neighborhood: string | null;
  street: string | null;
};

const cache = new Map<string, ViaCepAddress | null>();

function fromBrasilApi(data: BrasilApiCepAddress): ViaCepAddress {
  return {
    cep: data.cep,
    logradouro: data.street ?? "",
    bairro: data.neighborhood ?? "",
    localidade: data.city ?? "",
    uf: data.state ?? "",
  };
}

async function lookupBrasilApiCep(digits: string): Promise<ViaCepAddress | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("network");
  const data = (await res.json()) as BrasilApiCepAddress;
  if (!data?.city || !data?.state) return null;
  return fromBrasilApi(data);
}

export async function lookupCep(cep: string): Promise<ViaCepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  if (cache.has(digits)) return cache.get(digits)!;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("network");
  const data = (await res.json()) as ViaCepAddress;
  if (data?.erro) {
    const fallback = await lookupBrasilApiCep(digits);
    cache.set(digits, fallback);
    return fallback;
  }
  cache.set(digits, data);
  return data;
}

export type CepTargets = {
  setStreet?: (v: string) => void;
  setDistrict?: (v: string) => void;
  setCity?: (v: string) => void;
  setState?: (v: string) => void;
};

/**
 * Reusable CEP autofill hook.
 * Wire onCepChange to onChange (string) and onCepBlur to onBlur of the CEP input.
 * Triggers lookup automatically when 8 digits are entered, or on blur.
 */
export function useCepLookup(targets: CepTargets, setCep: (v: string) => void) {
  const [loading, setLoading] = useState(false);
  const [lastQueried, setLastQueried] = useState("");

  async function doLookup(raw: string) {
    const digits = onlyDigits(raw);
    if (digits.length !== 8) return;
    if (lastQueried === digits) return;
    setLastQueried(digits);
    setLoading(true);
    try {
      const addr = await lookupCep(digits);
      if (!addr) {
        toast.error("CEP não encontrado.");
        return;
      }
      targets.setStreet?.(addr.logradouro ?? "");
      targets.setDistrict?.(addr.bairro ?? "");
      targets.setCity?.(addr.localidade ?? "");
      targets.setState?.((addr.uf ?? "").toUpperCase());
      toast.success("Endereço preenchido pelo CEP");
    } catch {
      toast.error("Não foi possível consultar o CEP. Tente novamente.");
      setLastQueried("");
    } finally {
      setLoading(false);
    }
  }

  function onCepChange(v: string) {
    const masked = formatCep(v);
    setCep(masked);
    if (onlyDigits(masked).length === 8) void doLookup(masked);
  }

  function onCepBlur(v: string) {
    if (onlyDigits(v).length === 8) void doLookup(v);
  }

  return { loading, onCepChange, onCepBlur };
}
