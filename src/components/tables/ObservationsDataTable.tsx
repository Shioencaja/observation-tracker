"use client";

import { DataTableWithPagination } from "@/components/ui/data-table-with-pagination";
import { observationsColumns, Observation } from "./observations-columns";

interface ObservationsDataTableProps {
  observations: Observation[];
  [key: string]: any; // Allow any additional props
}

export default function ObservationsDataTable({
  observations,
}: ObservationsDataTableProps) {
  return (
    <div className="w-full">
      <DataTableWithPagination
        columns={observationsColumns}
        data={observations}
        itemsPerPage={10}
      />
    </div>
  );
}
