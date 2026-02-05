import { HomeHeader } from "../components/HomeHeader";
import { Footer } from "@/components/layout/Footer";

export default function AwarenessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeHeader />
      <main className="flex-1 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Doctor Awareness
        </h1>
        <p className="mt-4 text-lg text-gray-600">Coming soon</p>
      </main>
      <Footer />
    </div>
  );
}
