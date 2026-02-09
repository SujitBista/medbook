import Link from "next/link";
import { HomeHeader } from "../../components/HomeHeader";
import { Footer } from "@/components/layout/Footer";
import { Button, Card } from "@medbook/ui";

export const metadata = {
  title: "Cancellation & Refund Policy | MedBook",
  description:
    "MedBook appointment cancellation and refund policy. Doctor, patient, and no-show rules.",
};

export default function CancellationRefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeHeader />
      <main className="mx-auto flex-1 max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Home
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Cancellation & Refund Policy
        </h1>
        <p className="mt-2 text-gray-600">
          Last updated: February 2025. This policy applies to all appointments
          booked through MedBook.
        </p>

        <div className="mt-10 space-y-8">
          <Card title="Doctor or clinic cancellation">
            <p className="text-gray-700">
              If your appointment is cancelled by the doctor or the clinic
              (MedBook or practice staff), you will receive a{" "}
              <strong>full refund</strong> of the amount paid for the
              appointment. Refunds are processed automatically.
            </p>
          </Card>

          <Card title="Patient cancellation">
            <div className="space-y-3 text-gray-700">
              <p>
                If you cancel your own appointment, refund eligibility depends
                on timing:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Cancelled at least 24 hours before</strong> the
                  appointment start time: <strong>full refund</strong>.
                </li>
                <li>
                  <strong>Cancelled less than 24 hours before</strong> the
                  appointment: <strong>no refund</strong>.
                </li>
              </ul>
              <p>
                We use the appointment start time in UTC. Please cancel in good
                time to qualify for a full refund.
              </p>
            </div>
          </Card>

          <Card title="No-show">
            <p className="text-gray-700">
              If you do not attend your appointment and do not cancel in advance
              (no-show), <strong>no refund</strong> will be issued.
            </p>
          </Card>

          <Card title="Rescheduling">
            <p className="text-gray-700">
              Rescheduling an appointment to a new date/time does not trigger a
              refund. Your payment applies to the new appointment slot. Separate
              cancellation and refund rules apply if you later cancel the
              rescheduled appointment.
            </p>
          </Card>

          <Card title="Processing time">
            <p className="text-gray-700">
              Refunds are processed via our payment provider. Please allow{" "}
              <strong>5–10 business days</strong> for the refund to appear on
              your statement. If you do not see the refund after this period,
              please contact us with your appointment and payment details.
            </p>
          </Card>

          <Card title="Fees">
            <p className="text-gray-700">
              MedBook does not charge additional fees for eligible refunds. Your
              bank or card issuer may apply their own policies; we are not
              responsible for any fees they may charge.
            </p>
          </Card>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Questions? Contact us via the support or contact links in the
            footer.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
