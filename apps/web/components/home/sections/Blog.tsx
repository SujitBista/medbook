import { SectionHeader } from "../index";
import { Card, Button } from "@medbook/ui";
import Link from "next/link";

const blogPosts = [
  {
    id: "1",
    title: "5 Tips for Maintaining Heart Health",
    excerpt:
      "Learn simple lifestyle changes that can significantly improve your cardiovascular health and reduce the risk of heart disease.",
    date: "March 15, 2024",
    category: "Cardiology",
  },
  {
    id: "2",
    title: "Understanding Seasonal Allergies",
    excerpt:
      "Everything you need to know about managing seasonal allergies and when to consult with an allergist.",
    date: "March 10, 2024",
    category: "Allergy",
  },
  {
    id: "3",
    title: "The Importance of Regular Dental Checkups",
    excerpt:
      "Discover why regular dental visits are crucial for maintaining oral health and preventing serious dental issues.",
    date: "March 5, 2024",
    category: "Dentistry",
  },
];

export function Blog() {
  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Health & Wellness Blog"
          subtitle="Stay informed with the latest health tips and medical insights"
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Card
              key={post.id}
              className="hover:shadow-xl transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-primary-600 bg-primary-100 rounded-full">
                    {post.category}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{post.date}</span>
                  <Link href={`/blog/${post.id}`}>
                    <Button variant="ghost" size="sm">
                      Read More →
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
