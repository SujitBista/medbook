"use client";

import { PaymentStatus as PaymentStatusType } from "@medbook/types";

interface PaymentStatusProps {
  status: PaymentStatusType;
  amount: number;
  refundedAmount?: number;
  refundReason?: string;
}

export function PaymentStatus({
  status,
  amount,
  refundedAmount = 0,
  refundReason,
}: PaymentStatusProps) {
  const getStatusColor = (status: PaymentStatusType) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PENDING":
      case "PROCESSING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "REFUNDED":
        return "bg-gray-100 text-gray-800";
      case "PARTIALLY_REFUNDED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: PaymentStatusType) => {
    switch (status) {
      case "COMPLETED":
        return "Paid";
      case "PENDING":
        return "Pending";
      case "PROCESSING":
        return "Processing";
      case "FAILED":
        return "Failed";
      case "REFUNDED":
        return "Refunded";
      case "PARTIALLY_REFUNDED":
        return "Partially Refunded";
      default:
        return status;
    }
  };

  const isRefunded = status === "REFUNDED" || status === "PARTIALLY_REFUNDED";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Payment Status
        </span>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(status)}`}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Amount</span>
        <span className="text-sm font-semibold text-gray-900">
          ${amount.toFixed(2)}
        </span>
      </div>

      {isRefunded && refundedAmount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Refunded Amount
          </span>
          <span className="text-sm font-semibold text-gray-900">
            ${refundedAmount.toFixed(2)}
          </span>
        </div>
      )}

      {isRefunded && refundReason && (
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-700">Refund Reason</p>
          <p className="text-sm text-gray-600">{refundReason}</p>
        </div>
      )}
    </div>
  );
}
