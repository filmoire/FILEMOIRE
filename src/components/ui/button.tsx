import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-terre focus-visible:ring-offset-2 focus-visible:ring-offset-creme disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0 no-underline",
  {
    variants: {
      variant: {
        primary: "bg-prune text-creme hover:bg-prune-700 shadow-soft",
        accent: "bg-terre text-white hover:bg-terre-700 shadow-soft",
        secondary:
          "border border-prune/70 bg-white text-prune hover:bg-prune-50",
        outline:
          "border border-line bg-white text-ink hover:border-or hover:bg-creme-200",
        ghost: "text-prune hover:bg-prune-50",
        danger: "bg-danger text-white hover:bg-[#8a3125]",
        "danger-outline":
          "border border-danger/60 bg-white text-danger hover:bg-danger-bg",
        link: "h-auto px-0 text-prune underline underline-offset-4 hover:text-terre",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-ui="button"
        data-variant={variant ?? "primary"}
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
