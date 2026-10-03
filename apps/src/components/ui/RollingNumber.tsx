"use client";

import {
  type MotionValue,
  motion,
  useInView,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";

type Place = number | ".";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function placesFor(value: number, decimals: number): Place[] {
  const whole = Math.max(1, Math.floor(value)).toString().length;
  const ints = Array.from({ length: whole }, (_, i) => 10 ** (whole - 1 - i));
  const fracs = Array.from({ length: decimals }, (_, i) => 10 ** -(i + 1));
  return decimals > 0 ? [...ints, ".", ...fracs] : ints;
}

function digitsAt(value: number, place: number): number {
  const scaled = value / place;
  const nearest = Math.round(scaled);
  return Math.floor(Math.abs(scaled - nearest) < 1e-6 ? nearest : scaled);
}

function Glyph({ mv, digit }: { mv: MotionValue<number>; digit: number }) {
  const y = useTransform(mv, (latest) => {
    const offset = (10 + digit - (latest % 10)) % 10;
    return `${(offset > 5 ? offset - 10 : offset) * 100}%`;
  });
  return (
    <motion.span className="roll-glyph" style={{ y }}>
      {digit}
    </motion.span>
  );
}

function Digit({ value, place }: { value: number; place: number }) {
  const spring = useSpring(digitsAt(value, place), {
    stiffness: 70,
    damping: 18,
  });
  useEffect(() => {
    spring.set(digitsAt(value, place));
  }, [spring, value, place]);
  return (
    <span className="roll-digit">
      {DIGITS.map((digit) => (
        <Glyph key={digit} mv={spring} digit={digit} />
      ))}
    </span>
  );
}

interface RollingNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export function RollingNumber({
  value,
  decimals = 2,
  suffix = "",
  className = "",
}: RollingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const shown = inView ? value : 0;
  return (
    <span ref={ref} className={`roll ${className}`}>
      <span className="sr-only">{`${value.toFixed(decimals)}${suffix}`}</span>
      <span aria-hidden="true" className="roll-digits">
        {placesFor(value, decimals).map((place) =>
          place === "." ? (
            <span key="dot">.</span>
          ) : (
            <Digit key={place} value={shown} place={place} />
          ),
        )}
        {suffix}
      </span>
    </span>
  );
}
