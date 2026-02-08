import { Card } from "@medbook/ui";

const valueCards = [
  {
    title: "Doctor Guidance & Health Awareness",
    body: "Learn when medicine is needed—and when it's not.",
    icon: "📋",
  },
  {
    title: "Verified Doctors, Trusted Advice",
    body: "Real doctors. No misleading prescriptions.",
    icon: "✓",
  },
  {
    title: "Save Time & Avoid Unnecessary Visits",
    body: "Get clarity before rushing to the hospital.",
    icon: "⏱",
  },
] as const;

export function LandingValueCards() {
  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="why-medbook-heading">
      <h2
        id="why-medbook-heading"
        className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl text-center mb-10"
      >
        Healthcare that cares beyond appointments
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {valueCards.map((card) => (
          <Card
            key={card.title}
            className="text-center hover:shadow-lg transition-shadow"
          >
            <div className="mb-3 flex justify-center text-2xl" aria-hidden>
              {card.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {card.title}
            </h3>
            <p className="text-sm text-gray-600">{card.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
