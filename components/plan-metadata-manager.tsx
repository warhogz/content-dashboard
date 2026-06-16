"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { catalogKindLabel } from "@/lib/plan/catalogs";
import { deletePlanMetadataCatalogItemAction, upsertPlanMetadataCatalogItemAction } from "@/lib/supabase/plan-catalog-actions";
import { PlanMetadataCatalogKind, PlanMetadataCatalogs } from "@/lib/types";

function CatalogSection({
  kind,
  values
}: {
  kind: PlanMetadataCatalogKind;
  values: string[];
}) {
  const toast = useToast();
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("kind", kind);
    if (selectedValue) {
      formData.set("previous_value", selectedValue);
    }

    startTransition(async () => {
      const result = await upsertPlanMetadataCatalogItemAction(formData);
      toast.push({ title: result.ok ? "Saved" : "Error", description: result.message });
      if (result.ok) setSelectedValue(null);
    });
  }

  function remove(value: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("value", value);
      const result = await deletePlanMetadataCatalogItemAction(formData);
      toast.push({ title: result.ok ? "Removed" : "Error", description: result.message });
      if (result.ok && selectedValue === value) setSelectedValue(null);
    });
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} key={`${kind}-${selectedValue || "new"}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <Input name="value" placeholder={`Add ${catalogKindLabel(kind)}`} defaultValue={selectedValue || ""} />
        <Button type="submit" disabled={pending}>
          {selectedValue ? "Update" : "Add"}
        </Button>
      </form>

      <div className="grid gap-3">
        {values.map((value) => (
          <Card key={`${kind}-${value}`}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="font-medium" style={{ color: "var(--theme-text)" }}>
                {value}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedValue(value)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => remove(value)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function PlanMetadataManager({ catalogs }: { catalogs: PlanMetadataCatalogs }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <CardTitle>Planning Metadata</CardTitle>
            <CardDescription className="mt-1">Manage projects and rooms that feed both the card editor and the publishing planner. Content types come from the shared card type system.</CardDescription>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription className="mt-1">Brands, series and content directions for the plan.</CardDescription>
            </div>
            <CatalogSection kind="projects" values={catalogs.projects} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <CardTitle>Rooms / Zones</CardTitle>
              <CardDescription className="mt-1">Spatial or thematic zones used across planned posts.</CardDescription>
            </div>
            <CatalogSection kind="rooms" values={catalogs.rooms} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
