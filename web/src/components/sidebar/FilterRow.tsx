import { STRINGS } from "../../config/strings";
import { fieldActionClass, FieldRow } from "../common/FieldRow";
import { IconButton } from "../common/IconButton";
import { FILTER_INPUTS, type FilterInputProps } from "./filterInputs";

type Props = FilterInputProps & { onRemove: () => void };

export function FilterRow({ onRemove, ...input }: Props) {
  const Input = FILTER_INPUTS[input.def.kind];
  const removeLabel = STRINGS.sidebar.removeFilter(input.def.label);
  return (
    <FieldRow
      label={input.def.label}
      action={
        <IconButton label={removeLabel} onClick={onRemove} class={fieldActionClass}>
          ×
        </IconButton>
      }
    >
      <Input {...input} />
    </FieldRow>
  );
}
