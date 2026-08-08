import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BoutonPaginationProps = {
  children: ReactNode;
  disabled: boolean;
  href: string;
};

export function BoutonPagination({ children, disabled, href }: BoutonPaginationProps) {
  if (disabled) {
    return (
      <Button className="active:translate-y-0" variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "active:translate-y-0",
      )}
    >
      {children}
    </a>
  );
}
