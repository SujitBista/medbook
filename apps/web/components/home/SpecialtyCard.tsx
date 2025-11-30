import { Card } from "@medbook/ui";
import Link from "next/link";

interface SpecialtyCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
}

export function SpecialtyCard({
  icon,
  title,
  description,
  href = "/doctors",
}: SpecialtyCardProps) {
  const content = (
    <Card className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
      <div className="mb-4 flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
