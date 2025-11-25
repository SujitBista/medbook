import { AuthStatus } from "./components/AuthStatus";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@medbook/ui";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">MedBook</h1>
          <AuthStatus />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Welcome to MedBook
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Book appointments with doctors easily. Manage your health care
            appointments in one place.
          </p>

          {session ? (
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  ✓ You are signed in as {session.user.email}
                </p>
                <p className="mt-1 text-xs text-green-700">
                  Role: {session.user.role}
                </p>
              </div>
              <div className="flex gap-4">
                <Link href="/dashboard">
                  <Button variant="primary">Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
