import { inputValue } from "../../lib/dom";

export type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
  // Leading option with an empty value, e.g. "All"
  emptyLabel?: string;
  class?: string;
  disabled?: boolean;
};

export function OptionSelect({ value, options, onChange, label, emptyLabel, class: className, disabled }: Props) {
  return (
    <select value={value} onChange={(e) => onChange(inputValue(e))} aria-label={label} class={className} disabled={disabled}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {options.map((o) => (
        <option value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Options whose value is also their label
export const toOptions = (values: string[]): Option[] => values.map((value) => ({ value, label: value }));
