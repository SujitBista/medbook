import { SectionHeader, DoctorCard } from "../index";
import Link from "next/link";
import { Button } from "@medbook/ui";

const topDoctors = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    specialization: "Cardiologist",
    experience: "15 years",
    rating: 4.9,
    bio: "Board-certified cardiologist with expertise in preventive cardiology and heart disease management.",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    specialization: "Dermatologist",
    experience: "12 years",
    rating: 4.8,
    bio: "Specialized in cosmetic and medical dermatology, treating skin conditions with advanced techniques.",
  },
  {
    id: "3",
    name: "Dr. Emily Rodriguez",
    specialization: "Pediatrician",
    experience: "10 years",
    rating: 4.9,
    bio: "Dedicated to providing compassionate care for children from infancy through adolescence.",
  },
  {
    id: "4",
    name: "Dr. James Wilson",
    specialization: "Neurologist",
    experience: "18 years",
    rating: 4.7,
    bio: "Expert in diagnosing and treating neurological disorders with a patient-centered approach.",
  },
  {
    id: "5",
    name: "Dr. Lisa Anderson",
    specialization: "Dentist",
    experience: "14 years",
    rating: 4.8,
    bio: "Comprehensive dental care including preventive, restorative, and cosmetic dentistry.",
  },
  {
    id: "6",
    name: "Dr. Robert Taylor",
    specialization: "Orthopedic",
    experience: "16 years",
    rating: 4.9,
    bio: "Specialized in sports medicine and joint replacement surgeries with excellent outcomes.",
  },
];

export function TopDoctors() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Top Rated Doctors"
          subtitle="Meet our highly qualified healthcare professionals"
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {topDoctors.map((doctor) => (
            <DoctorCard key={doctor.id} {...doctor} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/doctors">
            <Button variant="outline" size="lg">
              View All Doctors
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
