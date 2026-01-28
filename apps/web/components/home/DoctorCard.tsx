"use client";

import { Card, Button } from "@medbook/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DoctorCardProps {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  imageUrl?: string;
  bio?: string;
  appointmentPrice?: number;
}

export function DoctorCard({
  id,
  name,
  specialization,
  experience,
  rating,
  imageUrl,
  bio,
  appointmentPrice: initialPrice,
}: DoctorCardProps) {
  const [appointmentPrice, setAppointmentPrice] = useState<number | undefined>(
    initialPrice
  );

  // Fetch price if not provided
  useEffect(() => {
    if (appointmentPrice === undefined && id) {
      fetch(`/api/doctors/${id}/price`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.appointmentPrice) {
            setAppointmentPrice(data.data.appointmentPrice);
          }
        })
        .catch((err) => {
          console.error("[DoctorCard] Error fetching price:", err);
        });
    }
  }, [id, appointmentPrice]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-6">
        {/* Doctor Photo/Avatar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {name}
            </h3>
            <p className="text-sm text-primary-600 font-medium">
              {specialization}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600">{rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Experience */}
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Experience:</span> {experience}
        </p>

        {/* Bio */}
        {bio && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{bio}</p>
        )}

        {/* Appointment Price */}
        {appointmentPrice && (
          <div className="mb-4">
            <p className="text-lg font-semibold text-primary-600">
              ${appointmentPrice.toFixed(2)}
              <span className="text-sm font-normal text-gray-500 ml-1">
                per visit
              </span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href={`/doctors/${id}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              View Profile
            </Button>
          </Link>
          <Link href={`/doctors/${id}`} className="flex-1">
            <Button variant="primary" className="w-full" size="sm">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
