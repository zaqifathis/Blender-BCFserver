import type { FunctionComponent } from "preact";
import type { FilterDef, FilterKind, FilterValue } from "../../config/topicFilters";
import { DateRangeFilterInput } from "./DateRangeFilterInput";
import { ValueFilterInput } from "./ValueFilterInput";

export type FilterInputProps = {
  def: FilterDef;
  value: FilterValue;
  options: string[];
  onChange: (change: FilterValue) => void;
};

// Input control per filter kind
export const FILTER_INPUTS: Record<FilterKind, FunctionComponent<FilterInputProps>> = {
  value: ValueFilterInput,
  list: ValueFilterInput,
  date: DateRangeFilterInput,
};
