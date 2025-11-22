import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: string;
}

export function StatCard({ title, value, icon: Icon, description, color }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className={cn("flex items-center justify-center p-4", color)}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <CardContent className="flex-1 p-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
      </div>
    </Card>
  );
}
