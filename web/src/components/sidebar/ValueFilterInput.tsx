import { STRINGS } from "../../config/strings";
import controls from "../common/controls.module.css";
import { OptionSelect, toOptions } from "../common/OptionSelect";
import type { FilterInputProps } from "./filterInputs";

export function ValueFilterInput({ def, value, options, onChange }: FilterInputProps) {
  return (
    <OptionSelect
      value={value.value ?? ""}
      options={toOptions(options)}
      onChange={(v) => onChange({ value: v })}
      label={def.label}
      emptyLabel={STRINGS.common.all}
      class={value.value ? controls.highlighted : undefined}
    />
  );
}
