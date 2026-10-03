import { TagBar, type TagItem } from "@/components/ui";

const ALL = "all";

export function ProtocolFilter({
  options,
  activeId,
}: {
  options: TagItem[];
  activeId?: string;
}) {
  return (
    <TagBar
      label="Filter by protocol"
      items={options}
      activeId={activeId ?? ALL}
      layoutId="protocol-filter"
    />
  );
}
