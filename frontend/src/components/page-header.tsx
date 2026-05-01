import { Link } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface BreadcrumbStep {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  breadcrumb?: BreadcrumbStep[];
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  badges,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumb.map((step, idx) => {
              const isLast = idx === breadcrumb.length - 1;
              return (
                <Fragment key={`${step.label}-${idx}`}>
                  <BreadcrumbItem>
                    {isLast || !step.to ? (
                      <BreadcrumbPage>{step.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        {/* biome-ignore lint/suspicious/noExplicitAny: dynamic route */}
                        <Link to={step.to as any}>{step.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {badges && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {badges}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
