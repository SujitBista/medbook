"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@medbook/ui";
import type { Department } from "@/app/admin/types";

interface DepartmentsTabProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export function DepartmentsTab({ onError, onSuccess }: DepartmentsTabProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      onError("");
      const response = await fetch("/api/admin/departments", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to fetch departments");
      }
      const data = await response.json();
      setDepartments(data.data ?? []);
    } catch (err) {
      console.error("[DepartmentsTab] Error fetching departments:", err);
      onError(
        err instanceof Error ? err.message : "Failed to fetch departments"
      );
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSearchKeywords("");
    setModalOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setName(d.name);
    setSearchKeywords(d.aliases?.map((a) => a.keyword).join(", ") ?? "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setName("");
    setSearchKeywords("");
    setSubmitLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      onError("Department name is required");
      return;
    }
    setSubmitLoading(true);
    onError("");
    try {
      if (editingId) {
        const response = await fetch(`/api/admin/departments/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            searchKeywords: searchKeywords.trim() || undefined,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || "Failed to update department");
        }
        onSuccess("Department updated successfully");
      } else {
        const response = await fetch("/api/admin/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            searchKeywords: searchKeywords.trim() || undefined,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || "Failed to create department");
        }
        onSuccess("Department created successfully");
      }
      closeModal();
      await fetchDepartments();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (
      !confirm(
        `Delete department "${label}"? This will remove its search keywords.`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/departments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to delete department");
      }
      onSuccess("Department deleted");
      await fetchDepartments();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to delete department"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Departments</h2>
        <Button onClick={openCreate}>Add department</Button>
      </div>
      <p className="text-sm text-gray-600">
        Add departments and optional search keywords (symptoms) so users can
        find them by typing e.g. &quot;ear pain&quot; or &quot;heart
        problem&quot;.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
          No departments yet. Add one to enable symptom-based search
          suggestions.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Search keywords
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {d.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {d.slug}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {d.aliases?.length
                      ? d.aliases.map((a) => a.keyword).join(", ")
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      className="text-primary-600 hover:text-primary-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id, d.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit department" : "Add department"}
            </h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="dept-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="dept-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ENT"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="dept-keywords"
                  className="block text-sm font-medium text-gray-700"
                >
                  Search keywords (symptoms)
                </label>
                <input
                  id="dept-keywords"
                  type="text"
                  value={searchKeywords}
                  onChange={(e) => setSearchKeywords(e.target.value)}
                  placeholder="e.g. ear pain, sore throat, palpitation"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Comma-separated. Users typing these will see this department
                  in suggestions.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? "Saving…" : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
