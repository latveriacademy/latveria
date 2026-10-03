import React, { useEffect, useState, useRef, type ReactNode, type ComponentProps } from "react";
import { cn } from "../utils";
import { motionTokens } from "./tokens";

/**
 * Hook to check if the user has requested reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/**
 * AnimatedNumber: smoothly counts from the old value to the new value using requestAnimationFrame.
 * If reduced motion is preferred or value isn't numeric, displays directly.
 */
export function AnimatedNumber({
  value,
  duration = motionTokens.duration.number,
  formatter = (n: number) => n.toLocaleString(),
  className,
}: {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (reducedMotion || typeof value !== "number" || isNaN(value)) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    if (startVal === endVal) return;

    let startTime: number | null = null;
    let animId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Figma-style natural spring-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [value, duration, reducedMotion]);

  return (
    <span className={cn("inline-block tabular-nums", className)}>{formatter(displayValue)}</span>
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
  ...props
}: ComponentProps<"div"> & { delay?: number }) {
  return (
    <div
      className={cn("motion-fade-in", className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
}

export function FadeUp({
  children,
  className,
  delay = 0,
  ...props
}: ComponentProps<"div"> & { delay?: number }) {
  return (
    <div
      className={cn("motion-fade-up", className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
}

export function FadeDown({
  children,
  className,
  delay = 0,
  ...props
}: ComponentProps<"div"> & { delay?: number }) {
  return (
    <div
      className={cn("motion-fade-down", className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
}

export function ScaleIn({
  children,
  className,
  delay = 0,
  ...props
}: ComponentProps<"div"> & { delay?: number }) {
  return (
    <div
      className={cn("motion-scale-in", className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
}

export function SlideIn({
  children,
  direction = "right",
  className,
  delay = 0,
  ...props
}: ComponentProps<"div"> & { direction?: "left" | "right"; delay?: number }) {
  const motionClass = direction === "left" ? "motion-slide-in-left" : "motion-slide-in-right";
  return (
    <div
      className={cn(motionClass, className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
}

export function StaggerContainer({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("motion-stagger-container", className)} {...props}>
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            className="motion-fade-up motion-stagger-item"
            style={{ "--stagger-index": idx } as React.CSSProperties}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

export function StaggerItem({
  children,
  index = 0,
  className,
  ...props
}: ComponentProps<"div"> & { index?: number }) {
  return (
    <div
      className={cn("motion-fade-up motion-stagger-item", className)}
      style={{ "--stagger-index": index } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

export function HoverScale({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("motion-interactive", className)} {...props}>
      {children}
    </div>
  );
}

export function PressScale({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("motion-press-only", className)} {...props}>
      {children}
    </div>
  );
}

export function PageTransition({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("motion-page-enter", className)} {...props}>
      {children}
    </div>
  );
}

export function Collapse({
  isOpen,
  children,
  className,
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("motion-collapse-wrapper", isOpen && "is-expanded", className)}>
      <div className="motion-collapse-inner">{children}</div>
    </div>
  );
}

export function Skeleton({ className, style, ...props }: ComponentProps<"div">) {
  return <div className={cn("motion-skeleton", className)} style={style} {...props} />;
}
