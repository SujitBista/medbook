"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@medbook/ui";
import { CommissionSettingsModal } from "@/components/admin/modals/CommissionSettingsModal";
import type { Doctor } from "@/app/admin/types";
import type { DoctorCommissionSettings } from "@medbook/types";

interface CommissionsTabProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

interface DoctorWithCommission extends Doctor {
  commissionSettings?: DoctorCommissionSettings | null;
}

export function CommissionsTab({ onError, onSuccess }: CommissionsTabProps) {
  const [doctors, setDoctors] = useState<DoctorWithCommission[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] =
    useState<DoctorWithCommission | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  const fetchDoctorsWithCommissions = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      queryParams.append("limit", "1000"); // Get all doctors for commission management
      queryParams.append("_t", Date.now().toString());

      const response = await fetch(
        `/api/admin/doctors?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to fetch doctors";
        try {
          const data = await response.json();
          errorMessage = data.error?.message || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const doctorsList: Doctor[] = data.data || [];

      // Fetch commission settings for each doctor
      const doctorsWithCommissions = await Promise.all(
        doctorsList.map(async (doctor) => {
          try {
            const settingsResponse = await fetch(
              `/api/admin/doctors/${doctor.id}/commission-settings`,
              {
                headers: {
                  "Content-Type": "application/json",
                },
                cache: "no-store",
              }
            );

            let commissionSettings: DoctorCommissionSettings | null = null;
            if (settingsResponse.ok) {
              const settingsData = await settingsResponse.json();
              if (settingsData.success && settingsData.data) {
                commissionSettings = settingsData.data;
              }
            }

            return {
              ...doctor,
              commissionSettings,
            };
          } catch (error) {
            console.error(
              `[CommissionsTab] Error fetching commission settings for doctor ${doctor.id}:`,
              error
            );
            return {
              ...doctor,
              commissionSettings: null,
            };
          }
        })
      );

      setDoctors(doctorsWithCommissions);
    } catch (err) {
      console.error("[CommissionsTab] Error fetching doctors:", err);
      onError(err instanceof Error ? err.message : "Failed to fetch doctors");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, onError]);

  useEffect(() => {
    fetchDoctorsWithCommissions();
  }, [fetchDoctorsWithCommissions]);

  const handleOpenCommissionSettings = (doctor: DoctorWithCommission) => {
    setSelectedDoctor(doctor);
    setShowCommissionModal(true);
  };

  const handleCommissionSettingsSuccess = () => {
    onSuccess("Commission settings updated successfully!");
    setShowCommissionModal(false);
    setSelectedDoctor(null);
    // Refresh the list to show updated settings
    fetchDoctorsWithCommissions();
  };

  const filteredDoctors = doctors.filter((doctor) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName =
      doctor.userFirstName && doctor.userLastName
        ? `${doctor.userFirstName} ${doctor.userLastName}`.toLowerCase()
        : "";
    const email = doctor.userEmail?.toLowerCase() || "";
    const specialization = doctor.specialization?.toLowerCase() || "";
    return (
      fullName.includes(query) ||
      email.includes(query) ||
      specialization.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Commission & Pricing Management
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage commission rates and appointment prices for doctors
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div>
          <label
            htmlFor="commission-search"
            className="block text-sm font-medium text-gray-700"
          >
            Search Doctors
          </label>
          <input
            type="text"
            id="commission-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or specialization..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading doctors...</p>
          </div>
        </div>
      )}

      {/* Doctors Table */}
      {!loading && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Specialization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Commission Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Appointment Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      {searchQuery
                        ? "No doctors found matching your search."
                        : "No doctors found."}
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doctor) => {
                    const fullName =
                      doctor.userFirstName && doctor.userLastName
                        ? `${doctor.userFirstName} ${doctor.userLastName}`
                        : doctor.userEmail || "N/A";
                    const hasSettings = !!doctor.commissionSettings;
                    const commissionRate = doctor.commissionSettings
                      ? (
                          Number(doctor.commissionSettings.commissionRate) * 100
                        ).toFixed(2)
                      : null;
                    const appointmentPrice = doctor.commissionSettings
                      ? Number(
                          doctor.commissionSettings.appointmentPrice
                        ).toFixed(2)
                      : null;

                    return (
                      <tr
                        key={doctor.id}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            {doctor.profilePictureUrl ? (
                              <img
                                src={doctor.profilePictureUrl}
                                alt={fullName}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <span className="text-sm font-medium">
                                  {fullName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {fullName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {doctor.userEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {doctor.specialization ? (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                              {doctor.specialization}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Unspecified
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {hasSettings ? (
                            <span className="text-sm font-medium text-gray-900">
                              {commissionRate}%
                            </span>
                          ) : (
                            <span className="text-xs text-yellow-600 font-medium">
                              Not Set
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {hasSettings ? (
                            <span className="text-sm font-medium text-gray-900">
                              ${appointmentPrice}
                            </span>
                          ) : (
                            <span className="text-xs text-yellow-600 font-medium">
                              Not Set
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <Button
                            onClick={() => handleOpenCommissionSettings(doctor)}
                            variant="primary"
                            size="sm"
                          >
                            {hasSettings ? "Edit Settings" : "Configure"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission Settings Modal */}
      {selectedDoctor && (
        <CommissionSettingsModal
          isOpen={showCommissionModal}
          doctorId={selectedDoctor.id}
          doctorName={
            selectedDoctor.userFirstName && selectedDoctor.userLastName
              ? `${selectedDoctor.userFirstName} ${selectedDoctor.userLastName}`
              : selectedDoctor.userEmail || "Doctor"
          }
          onClose={() => {
            setShowCommissionModal(false);
            setSelectedDoctor(null);
          }}
          onSuccess={handleCommissionSettingsSuccess}
          onError={onError}
        />
      )}
    </div>
  );
}
