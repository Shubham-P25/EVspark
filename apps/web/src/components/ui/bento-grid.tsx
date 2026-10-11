import { ReactNode } from "react";
import { cn } from "cn";

export function BentoGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 md:grid-cols-3 gap-4 md:gap-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  badge,
}: {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon?: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
  href?: string;
  cta?: string;
  badge?: string;
}) {
  return (
    <div
      key={name}
      className={cn(
        "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-[#DADCE0] transition-all duration-300 hover:shadow-md hover:ring-[#1A73E8]/40",
        className
      )}
    >
      {background && (
        <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl bg-[#F8F9FA] transition-transform duration-300 group-hover:scale-[1.02]">
          {background}
        </div>
      )}
      <div className="z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="grid size-9 place-items-center rounded-lg bg-[#E8F0FE] text-[#1A73E8]">
                <Icon size={20} />
              </div>
            )}
            <h3 className="font-semibold text-lg text-[#202124] tracking-tight">
              {name}
            </h3>
          </div>
          {badge && (
            <span className="rounded-full bg-[#E8F0FE] px-2.5 py-0.5 text-xs font-medium text-[#1A73E8]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-[#5F6368]">{description}</p>
      </div>

      {href && cta && (
        <div className="mt-4 flex items-center pt-2">
          <a
            href={href}
            className="inline-flex items-center text-sm font-medium text-[#1A73E8] hover:text-[#185ABC] hover:underline"
          >
            {cta} &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
