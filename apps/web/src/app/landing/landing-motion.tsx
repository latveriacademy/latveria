import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function LandingMotion({
  page,
  root,
}: {
  page: "home" | "about";
  root: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        if (page === "about") {
          gsap.from("[data-about-line]", {
            yPercent: 110,
            rotate: 2,
            duration: 1.1,
            stagger: 0.13,
            ease: "power3.out",
          });
          gsap.from("[data-about-emblem]", {
            scale: 0.7,
            rotate: -35,
            opacity: 0,
            duration: 1.3,
            delay: 0.3,
            ease: "back.out(1.2)",
          });
          gsap.to("[data-about-emblem]", {
            yPercent: 25,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-about-emblem]",
              start: "top top",
              end: "+=600",
              scrub: 1,
            },
          });
          gsap.utils.toArray<HTMLElement>("[data-about-reveal]").forEach((section) => {
            gsap.from(section, {
              y: 30,
              opacity: 0.35,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: { trigger: section, start: "top 88%", once: true },
            });
          });
          return;
        }
        const intro = gsap.timeline({ defaults: { ease: "power3.out", duration: 1.1 } });
        intro
          .from(".hero-title-line", { yPercent: 115, rotate: 3, stagger: 0.15 })
          .from('[data-float="book"]', { y: 60, rotate: -22, scale: 0.85, opacity: 0 }, 0.2)
          .from('[data-float="back"]', { x: 30, y: 70, rotate: 16, opacity: 0 }, 0.35)
          .from('[data-float="front"]', { x: -30, y: 50, rotate: -18, opacity: 0 }, 0.48)
          .from(
            '[data-float="seal"]',
            { scale: 0.5, rotate: -40, opacity: 0, ease: "back.out(1.5)" },
            0.6,
          );
        gsap.to(".hero-art", {
          yPercent: -10,
          rotate: 5,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-home-hero]",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.utils.toArray<HTMLElement>("[data-float]").forEach((layer) => {
          gsap.to(layer, {
            yPercent: layer.dataset.float === "front" ? -20 : 10,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-home-hero]",
              start: "top top",
              end: "bottom top",
              scrub: 1.2,
            },
          });
        });
      },
      root,
    );
    if (page === "home") {
      media.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.from("[data-story-stage]", {
            rotateY: -14,
            rotateZ: -3,
            y: 35,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: "[data-story-stage]", start: "top 85%", once: true },
          });
          gsap.from("[data-story-connections]", {
            opacity: 0,
            y: -15,
            ease: "none",
            scrollTrigger: {
              trigger: '[data-story-step="1"]',
              start: "top 75%",
              end: "center 65%",
              scrub: 0.7,
            },
          });
          gsap.from("[data-story-answer], [data-story-resolution]", {
            opacity: 0,
            scale: 0.8,
            transformOrigin: "center",
            stagger: 0.15,
            ease: "back.out(1.4)",
            scrollTrigger: {
              trigger: '[data-story-step="2"]',
              start: "top 80%",
              end: "center 65%",
              scrub: 0.7,
            },
          });
          gsap.from("[data-story-note]", {
            opacity: 0,
            rotate: -12,
            x: -30,
            ease: "none",
            scrollTrigger: {
              trigger: '[data-story-step="1"]',
              start: "top 70%",
              end: "center 65%",
              scrub: 1,
            },
          });
        },
        root,
      );
    }
    // Font settling can change chapter offsets; refresh once, and cancel on route exit.
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) ScrollTrigger.refresh();
    });
    return () => {
      active = false;
      media.revert();
    };
  }, [page, root]);
  return null;
}
