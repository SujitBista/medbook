import { Card, Button } from "@medbook/ui";
import Link from "next/link";

const AWARENESS_PREVIEWS = [
  {
    title: "Why cough syrup is not always needed",
    excerpt:
      "Cough is often your body's natural defense. Most mild coughs heal without medicine.",
    author: "Dr. ABC, Medicine",
    tag: "Respiratory",
  },
  {
    title: "When fever becomes urgent",
    excerpt:
      "See a doctor if fever lasts > 3 days, or comes with breathing trouble or severe weakness.",
    author: "Dr. XYZ, General",
    tag: "Urgent signs",
  },
] as const;

export function DoctorAwarenessPreview() {
  return (
    <section
      className="mt-20 sm:mt-24"
      aria-labelledby="doctor-awareness-heading"
    >
      <div className="text-center mb-10">
        <h2
          id="doctor-awareness-heading"
          className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
        >
          Doctor Awareness
        </h2>
        <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
          Short, doctor-written tips to help you make better health decisions.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {AWARENESS_PREVIEWS.map((post) => (
          <Card
            key={post.title}
            className="hover:shadow-lg transition-shadow text-left"
          >
            <span className="inline-block text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded mb-3">
              {post.tag}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {post.title}
            </h3>
            <p className="text-sm text-gray-600 mb-3">{post.excerpt}</p>
            <p className="text-xs text-gray-500">{post.author}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/awareness" className="no-underline">
          <Button
            variant="outline"
            size="lg"
            className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold"
          >
            Read more
          </Button>
        </Link>
      </div>
    </section>
  );
}
