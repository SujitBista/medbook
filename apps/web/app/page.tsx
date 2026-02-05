import { HomeHeader } from "./components/HomeHeader";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@medbook/ui";
import { HeroSearch } from "@/components/home";
import {
  PopularSpecialties,
  HowItWorks,
  TopDoctors,
  Testimonials,
  AppBenefits,
  Blog,
  LandingValueCards,
  DoctorAwarenessPreview,
} from "@/components/home/sections";
import { Footer } from "@/components/layout/Footer";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <HomeHeader />

      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden border-b border-gray-100">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
              Find & Book the Right Doctor — At the Right Time
            </h1>
            <p className="mt-5 text-lg leading-8 text-gray-700 sm:text-xl max-w-3xl mx-auto font-medium">
              Book appointments, manage records, and get doctor guidance +
              health awareness to avoid unnecessary treatment.
            </p>

            {/* Primary CTA: search (Find & Book Doctor) is the main action; no standalone Book Now to avoid competing CTAs */}
            <HeroSearch />

            {/* How it works — 4 steps matching real flow: search → doctors → profile/slot → confirm & pay */}
            <div className="mt-10 mx-auto max-w-4xl">
              <h2 className="text-lg font-semibold text-gray-900 text-center mb-8">
                How it works
              </h2>
              <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 text-center">
                {/* Faint connector line (desktop only) */}
                <div
                  className="hidden lg:block absolute top-[26px] left-[12.5%] right-[12.5%] h-px bg-gray-200"
                  aria-hidden
                />

                <div className="relative flex flex-col items-center">
                  <span
                    className="mb-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-600 px-2 text-sm font-bold text-white"
                    aria-hidden
                  >
                    1
                  </span>
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-primary-600 transition-opacity"
                    style={{ backgroundColor: "#e0f2fe" }}
                    aria-hidden
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Choose a specialty
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Search or browse
                  </p>
                </div>
                <div className="relative flex flex-col items-center">
                  <span
                    className="mb-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-600 px-2 text-sm font-bold text-white"
                    aria-hidden
                  >
                    2
                  </span>
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-primary-600"
                    style={{ backgroundColor: "#e0f2fe" }}
                    aria-hidden
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Pick a doctor
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    View profile
                  </p>
                </div>
                <div className="relative flex flex-col items-center">
                  <span
                    className="mb-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-600 px-2 text-sm font-bold text-white"
                    aria-hidden
                  >
                    3
                  </span>
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-primary-600"
                    style={{ backgroundColor: "#e0f2fe" }}
                    aria-hidden
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Select a time
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Pick a slot
                  </p>
                </div>
                <div className="relative flex flex-col items-center">
                  <span
                    className="mb-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-600 px-2 text-sm font-bold text-white"
                    aria-hidden
                  >
                    4
                  </span>
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-primary-600"
                    style={{ backgroundColor: "#e0f2fe" }}
                    aria-hidden
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Confirm & pay
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Sign in, done
                  </p>
                </div>
              </div>

              {/* Trust reassurance line */}
              <p className="mt-8 text-xs sm:text-sm text-gray-400 text-center leading-relaxed">
                Secure booking. No hidden charges. Verified hospitals only.
              </p>
            </div>

            {/* Smooth transition: divider + extra spacing before next section */}
            <div className="mt-16 sm:mt-20 pt-8 sm:pt-10 border-t border-gray-100" />

            {/* Why MedBook value cards */}
            <LandingValueCards />

            {/* Doctor Awareness preview */}
            <DoctorAwarenessPreview />

            {/* Secondary CTAs: dashboard / get started — outline style so primary remains the search above */}
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {session?.user?.role === "PATIENT" && (
                <Link
                  href="/dashboard/patient"
                  className="w-full sm:w-auto no-underline"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 hover:border-primary-700 w-full sm:w-auto px-8 py-6 text-base font-semibold"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              )}
              {!session && (
                <Link
                  href="/register"
                  className="w-full sm:w-auto no-underline"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 w-full sm:w-auto px-8 py-6 text-base font-semibold"
                  >
                    Get Started Free
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 gap-8 sm:grid-cols-4">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-4xl font-bold text-gray-900">10K+</div>
                <div className="text-sm text-gray-700 mt-2 font-medium">
                  patients guided toward better health decisions
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-4xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-700 mt-2 font-medium">
                  verified doctors focused on ethical care
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-4xl font-bold text-gray-900">50+</div>
                <div className="text-sm text-gray-700 mt-2 font-medium">
                  specialties with preventive guidance
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-4xl font-bold text-gray-900">24/7</div>
                <div className="text-sm text-gray-700 mt-2 font-medium">
                  access to care & health information
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Specialties Section */}
      <PopularSpecialties />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Top Doctors Section */}
      <TopDoctors />

      {/* App Benefits Section */}
      <AppBenefits />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Blog Section */}
      <Blog />

      {/* CTA Section */}
      <section className="bg-gray-50 py-16 sm:py-24 relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl shadow-xl p-8 md:p-12 relative overflow-hidden"
            style={{
              background: "linear-gradient(to right, #0284c7, #0369a1)",
              minHeight: "200px",
            }}
          >
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              ></div>
            </div>

            <div className="text-center relative z-10">
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-white"
                style={{ color: "#ffffff" }}
              >
                Ready to Book Your Appointment?
              </h2>
              <p
                className="text-lg mb-8 max-w-2xl mx-auto font-medium"
                style={{ color: "rgba(255, 255, 255, 0.95)" }}
              >
                Join thousands of satisfied patients who trust MedBook for their
                healthcare needs. Start booking today!
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/doctors" className="no-underline">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-primary-600 hover:bg-gray-50 shadow-lg font-semibold px-8"
                    style={{ backgroundColor: "#ffffff", color: "#0284c7" }}
                  >
                    Browse Doctors
                  </Button>
                </Link>
                {!session && (
                  <>
                    <Link href="/register" className="no-underline">
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-2 border-white text-white hover:bg-white/20 font-semibold px-8"
                        style={{ borderColor: "#ffffff", color: "#ffffff" }}
                      >
                        Create Account
                      </Button>
                    </Link>
                    <Link href="/login" className="no-underline">
                      <Button
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/10 font-semibold px-8"
                        style={{ color: "#ffffff" }}
                      >
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
                {/* Removed "Go to Dashboard" - users can access it from header/navigation */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
