"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function LandingMotion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const intro = gsap.timeline({ defaults: { ease: "power3.out", duration: 1 } });
      intro
        .from(".hero-title-line", { y: 55, opacity: 0, stagger: 0.13 })
        .from(".hero-art", { rotate: -12, scale: 0.86, opacity: 0 }, 0.1)
        .from(".hero-description, .main-link", { y: 20, opacity: 0, stagger: 0.1 }, 0.4);

      gsap.to(".hero-logo", {
        yPercent: 12,
        rotate: 8,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
      });
      gsap.utils.toArray<HTMLElement>(".method-list li").forEach((step) => {
        gsap.from(step, {
          y: 40,
          opacity: 0.35,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: step, start: "top 90%", once: true },
        });
      });
      gsap.from(".closing h2", {
        y: 35,
        opacity: 0.4,
        duration: 0.9,
        scrollTrigger: { trigger: ".closing", start: "top 80%", once: true },
      });
    });
    return () => media.revert();
  }, []);

  return null;
}
