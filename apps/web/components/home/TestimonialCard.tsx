import { Card } from "@medbook/ui";

interface TestimonialCardProps {
  name: string;
  rating: number;
  review: string;
  imageUrl?: string;
  location?: string;
}

export function TestimonialCard({
  name,
  rating,
  review,
  imageUrl,
  location,
}: TestimonialCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="h-full">
      <div className="p-6">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`h-5 w-5 ${
                i < rating ? "text-yellow-400" : "text-gray-300"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        {/* Review Text */}
        <p className="text-gray-700 mb-6 italic">&ldquo;{review}&rdquo;</p>

        {/* User Info */}
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{name}</p>
            {location && <p className="text-sm text-gray-600">{location}</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}
