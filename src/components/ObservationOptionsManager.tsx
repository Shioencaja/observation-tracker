"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ObservationOption } from "@/types/observation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ObservationOptionsManagerProps {
  onOptionsChange: () => void;
}

export default function ObservationOptionsManager({
  onOptionsChange,
}: ObservationOptionsManagerProps) {
  const [options, setOptions] = useState<ObservationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("observation_options")
        .select("*")
        .eq("is_visible", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error("Error loading options:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Observation Options</CardTitle>
          <CardDescription>Loading options...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            Available Observation Options ({options.length})
          </CardTitle>
          <CardDescription>
            Predefined options for observations. These options are shared across
            all users and cannot be modified.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No options available</h3>
            <p className="text-muted-foreground">
              Contact your administrator to add observation options.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell>
                      <div className="font-medium">{option.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground">
                        {option.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Available</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
