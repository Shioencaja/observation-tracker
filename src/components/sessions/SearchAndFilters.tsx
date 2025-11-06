"use client";

import { Search, Filter, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  selectedAgency: string;
  selectedDate: string;
  onAgencyChange: (agency: string) => void;
  onDateChange: (date: string) => void;
  uniqueAgencies: string[];
  uniqueDates: string[];
  onClearFilters: () => void;
  canExport: boolean;
  onExportAll: () => void;
  filteredCount: number;
  totalCount: number;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
}

export function SearchAndFilters({
  searchTerm,
  onSearchChange,
  onSearch,
  onClearSearch,
  selectedAgency,
  selectedDate,
  onAgencyChange,
  onDateChange,
  uniqueAgencies,
  uniqueDates,
  onClearFilters,
  canExport,
  onExportAll,
  filteredCount,
  totalCount,
  filtersOpen,
  onFiltersOpenChange,
}: SearchAndFiltersProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Search Bar */}
      <div className="relative w-full">
        <Input
          placeholder="Buscar sesiones..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pr-20 border-gray-200 focus:border-gray-400 focus:ring-gray-400 h-9 text-sm"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearch}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            title="Buscar"
          >
            <Search className="h-4 w-4" />
          </Button>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              title="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toggle, Export Button and Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Popover open={filtersOpen} onOpenChange={onFiltersOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Filtros
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Filtros</h4>

                {/* Agency Filter */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Agencia
                  </Label>
                  <Select value={selectedAgency} onValueChange={onAgencyChange}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las agencias</SelectItem>
                      {uniqueAgencies.map((agency) => (
                        <SelectItem key={agency} value={agency}>
                          {agency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Fecha
                  </Label>
                  <Select value={selectedDate} onValueChange={onDateChange}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las fechas</SelectItem>
                      {uniqueDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {date}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="h-8 text-sm text-gray-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Export Button - Only for project creators and admins */}
          {canExport && (
            <Button
              onClick={onExportAll}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={filteredCount === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              Exportar CSV
            </Button>
          )}
        </div>

        <span className="text-xs text-gray-500">
          {filteredCount} de {totalCount} sesiones
        </span>
      </div>
    </div>
  );
}

