import { useCallback, useRef, useState } from "react";
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
};

export async function lookupCep(cep: string): Promise<ViaCepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) throw new Error("network");
  const data = (await res.json()) as ViaCepAddress & { erro?: boolean };
  if (data.erro) return null;
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
 * Returns: { loading, onCepChange, onCepBlur } to wire on the CEP input.
 * Formats CEP as 00000-000, looks up viacep when 8 digits are present
 * or on blur, dedupes repeated lookups for the same CEP.
 */
export function useCepLookup(targets: CepTargets, setCep: (v: string) => void) {
  const [loading, setLoading] = useState(false);
  const lastQueried = useRef<string>("");

  const doLookup = useCallback(
    async (raw: string) => {
      const digits = onlyDigits(raw);
      if (digits.length !== 8) return;
      if (lastQueried.current === digits) return;
      lastQueried.current = digits;
      setLoading(true);
      try {
        const addr = await lookupCep(digits);
        if (!addr) {
          toast.error("CEP não encontrado.");
          return;
        }
        if (targets.setStreet && addr.logradouro) targets.setStreet(addr.logradouro);
        if (targets.setDistrict && addr.bairro) targets.setDistrict(addr.bairro);
        if (targets.setCity) targets.setCity(addr.localidade ?? "");
        if (targets.setState) targets.setState((addr.uf ?? "").toUpperCase());
      } catch {
        toast.error("Não foi possível consultar o CEP. Tente novamente.");
        lastQueried.current = "";
      } finally {
        setLoading(false);
      }
    },
    [targets],
  );

  const onCepChange = useCallback(
    (v: string) => {
      const masked = formatCep(v);
      setCep(masked);
      if (onlyDigits(masked).length === 8) void doLookup(masked);
    },
    [doLookup, setCep],
  );

  const onCepBlur = useCallback(
    (v: string) => {
      if (onlyDigits(v).length === 8) void doLookup(v);
    },
    [doLookup],
  );

  return { loading, onCepChange, onCepBlur };
}
