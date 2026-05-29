import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string; }) {
  return (
    <Card className="border-dashed bg-white/[0.04]">
      <CardContent className="p-8 text-center">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
