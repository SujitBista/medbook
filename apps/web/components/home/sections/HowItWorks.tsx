import { SectionHeader } from "../index";

const steps = [
  {
    number: "1",
    title: "Search Doctor",
    description:
      "Browse our network of qualified doctors by specialty, location, or name",
    icon: (
      <svg
        className="h-8 w-8"
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
    ),
  },
  {
    number: "2",
    title: "Select a Time Slot",
    description:
      "Choose from available appointment times that fit your schedule",
    icon: (
      <svg
        className="h-8 w-8"
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
    ),
  },
  {
    number: "3",
    title: "Instant Booking Confirmation",
    description: "Receive immediate confirmation with all appointment details",
    icon: (
      <svg
        className="h-8 w-8"
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
    ),
  },
  {
    number: "4",
    title: "Visit Clinic or Online Consultation",
    description:
      "Attend your appointment in-person or via secure video consultation",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="How It Works"
          subtitle="Book your appointment in just a few simple steps"
        />
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              {/* Step Number Badge */}
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white text-2xl font-bold shadow-lg relative z-10"
                style={{
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                }}
              >
                {step.number}
              </div>

              {/* Icon */}
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#e0f2fe",
                  color: "#0284c7",
                }}
              >
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.description}</p>

              {/* Connector Line (hidden on last item) */}
              {step.number !== "4" && (
                <div
                  className="hidden lg:block absolute top-8 left-full h-0.5 -z-10"
                  style={{
                    width: "calc(100% - 4rem)",
                    left: "calc(50% + 2rem)",
                    backgroundColor: "#bae6fd",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
