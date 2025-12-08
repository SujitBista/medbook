"use client";

import { useState, useEffect, useMemo } from "react";
import { SectionHeader, TestimonialCard } from "../index";

const testimonials = [
  {
    name: "John Smith",
    rating: 5,
    review:
      "MedBook made it so easy to find and book an appointment with a specialist. The whole process was seamless, and I got confirmation instantly. Highly recommend!",
    location: "New York, NY",
  },
  {
    name: "Maria Garcia",
    rating: 5,
    review:
      "I've been using MedBook for all my family's healthcare needs. The ability to see doctor availability in real-time and book instantly is a game-changer.",
    location: "Los Angeles, CA",
  },
  {
    name: "David Lee",
    rating: 5,
    review:
      "The platform is user-friendly and the doctors are top-notch. I found a great cardiologist and was able to book an appointment the same day. Excellent service!",
    location: "Chicago, IL",
  },
  {
    name: "Jennifer Brown",
    rating: 5,
    review:
      "As a busy professional, I love that I can book appointments 24/7 without having to call during business hours. MedBook has simplified my healthcare management.",
    location: "Houston, TX",
  },
  {
    name: "Robert Davis",
    rating: 5,
    review:
      "The online consultation feature is fantastic! I had a video appointment with my doctor and it was just as effective as an in-person visit. Very convenient.",
    location: "Phoenix, AZ",
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Use useMemo to compute displayed testimonials instead of useEffect
  const displayedTestimonials = useMemo(() => {
    const newTestimonials = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % testimonials.length;
      newTestimonials.push(testimonials[index]);
    }
    return newTestimonials;
  }, [currentIndex]);

  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="What Our Patients Say"
          subtitle="Read reviews from patients who trust MedBook for their healthcare needs"
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayedTestimonials.map((testimonial, index) => (
            <TestimonialCard
              key={`${testimonial.name}-${index}`}
              {...testimonial}
            />
          ))}
        </div>

        {/* Dots Indicator */}
        <div className="mt-8 flex justify-center gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex ? "bg-primary-600 w-8" : "bg-gray-300"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
