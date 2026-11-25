import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Empty>
        <EmptyHeader>
          <p className="text-5xl font-bold tracking-tight text-brand">404</p>
          <EmptyTitle>Página no encontrada</EmptyTitle>
          <EmptyDescription>La sección que buscás no existe o fue movida.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/">Volver al inicio</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
