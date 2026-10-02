import { TagBar, type TagItem } from "@/components/ui";

const ALL = "all";

export function AggregatorFilter({
  options,
  activeId,
}: {
  options: TagItem[];
  activeId?: string;
}) {
  return (
    <TagBar
      label="Filter by aggregator"
      items={options}
      activeId={activeId ?? ALL}
      layoutId="aggregator-filter"
    />
  );
}
