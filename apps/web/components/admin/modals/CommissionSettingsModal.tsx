"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@medbook/ui";
import type { DoctorCommissionSettings } from "@medbook/types";

interface CommissionSettingsModalProps {
  isOpen: boolean;
  doctorId: string;
  doctorName: string;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (error: string) => void;
}

interface FormData {
  commissionRate: string; // Percentage (0-100)
  appointmentPrice: string; // Currency amount
}

interface FormErrors {
  commissionRate?: string;
  appointmentPrice?: string;
}

export function CommissionSettingsModal({
  isOpen,
  doctorId,
  doctorName,
  onClose,
  onSuccess,
  onError,
}: CommissionSettingsModalProps) {
  const [formData, setFormData] = useState<FormData>({
    commissionRate: "",
    appointmentPrice: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [existingSettings, setExistingSettings] =
    useState<DoctorCommissionSettings | null>(null);

  // Fetch existing settings when modal opens
  useEffect(() => {
    if (isOpen && doctorId) {
      fetchCommissionSettings();
    } else {
      resetForm();
    }
  }, [isOpen, doctorId]);

  const fetchCommissionSettings = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `/api/admin/doctors/${doctorId}/commission-settings`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const settings = data.data;
          setExistingSettings(settings);
          setFormData({
            commissionRate: (settings.commissionRate * 100).toFixed(2), // Convert to percentage
            appointmentPrice: settings.appointmentPrice.toFixed(2),
          });
        } else {
          // No settings exist yet, form will be empty
          setExistingSettings(null);
        }
      } else if (response.status === 404) {
        // No settings exist yet
        setExistingSettings(null);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to fetch commission settings"
        );
      }
    } catch (error) {
      console.error(
        "[CommissionSettingsModal] Error fetching settings:",
        error
      );
      if (onError) {
        onError(
          error instanceof Error
            ? error.message
            : "Failed to fetch commission settings"
        );
      }
    } finally {
      setIsFetching(false);
    }
  };

  const resetForm = () => {
    setFormData({
      commissionRate: "",
      appointmentPrice: "",
    });
    setErrors({});
    setExistingSettings(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate commission rate
    if (!formData.commissionRate || formData.commissionRate.trim() === "") {
      newErrors.commissionRate = "Commission rate is required";
    } else {
      const rate = parseFloat(formData.commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.commissionRate = "Commission rate must be between 0 and 100";
      }
    }

    // Validate appointment price
    if (!formData.appointmentPrice || formData.appointmentPrice.trim() === "") {
      newErrors.appointmentPrice = "Appointment price is required";
    } else {
      const price = parseFloat(formData.appointmentPrice);
      if (isNaN(price) || price <= 0) {
        newErrors.appointmentPrice = "Appointment price must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const commissionRate = parseFloat(formData.commissionRate) / 100; // Convert percentage to decimal
      const appointmentPrice = parseFloat(formData.appointmentPrice);

      const url = `/api/admin/doctors/${doctorId}/commission-settings`;
      const method = existingSettings ? "PUT" : "POST";
      const body = {
        commissionRate,
        appointmentPrice,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            `Failed to ${existingSettings ? "update" : "create"} commission settings`
        );
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error("[CommissionSettingsModal] Error saving settings:", error);
      if (onError) {
        onError(
          error instanceof Error
            ? error.message
            : "Failed to save commission settings"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Commission Settings
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Doctor: <span className="font-medium">{doctorName}</span>
        </p>

        {isFetching ? (
          <div className="py-8 text-center">
            <p className="text-gray-500">Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="commissionRate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Commission Rate (%)
              </label>
              <Input
                id="commissionRate"
                name="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.commissionRate}
                onChange={handleChange}
                placeholder="e.g., 10.00"
                className={errors.commissionRate ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.commissionRate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.commissionRate}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Percentage of appointment price that goes to the platform
                (0-100%)
              </p>
            </div>

            <div>
              <label
                htmlFor="appointmentPrice"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Appointment Price ($)
              </label>
              <Input
                id="appointmentPrice"
                name="appointmentPrice"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.appointmentPrice}
                onChange={handleChange}
                placeholder="e.g., 100.00"
                className={errors.appointmentPrice ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.appointmentPrice && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.appointmentPrice}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Price charged to patients for appointments with this doctor
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading
                  ? "Saving..."
                  : existingSettings
                    ? "Update Settings"
                    : "Create Settings"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
