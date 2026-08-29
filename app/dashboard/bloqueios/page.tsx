import { Blocks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BloqueiosPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Bloqueios</h1>
      <p className="mt-1 text-muted-foreground">Em breve: bloqueios de agenda.</p>
      <Card className="mt-8">
        <CardHeader className="items-center text-center">
          <Blocks className="size-8 text-muted-foreground" />
          <CardTitle className="mt-3">Nenhum bloqueio</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Bloqueie períodos para pausas, férias e exceções.
        </CardContent>
      </Card>
    </div>
  );
}
