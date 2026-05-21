"use client";

import { useMemo, useState } from "react";

type ManualReservationType = "flight" | "hotel" | "train" | "car" | "dinner" | "tour" | "experience" | "other";

export interface ManualReservationFormValue {
  reservationType: ManualReservationType;
  title: string;
  provider: string;
  localDateTime: string;
  location: string;
  confirmationCode: string;
  notes: string;
  assignedTo: string[];
}

interface FamilyMemberOption {
  id: string;
  name: string;
}

interface ManualReservationEntryModalProps {
  familyMembers: FamilyMemberOption[];
  defaultAssignedTo: string[];
  onClose: () => void;
  onSave: (value: ManualReservationFormValue) => void;
}

const RESERVATION_TYPE_OPTIONS: Array<{ value: ManualReservationType; label: string }> = [
  { value: "flight", label: "Flight" },
  { value: "hotel", label: "Hotel" },
  { value: "train", label: "Train" },
  { value: "car", label: "Car" },
  { value: "dinner", label: "Dinner" },
  { value: "tour", label: "Tour" },
  { value: "experience", label: "Experience" },
  { value: "other", label: "Other" },
];

function localDateTimeDefault(): string {
  const now = new Date(Date.now() + 60 * 60 * 1000);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function ManualReservationEntryModal({
  familyMembers,
  defaultAssignedTo,
  onClose,
  onSave,
}: ManualReservationEntryModalProps) {
  const defaultAssignees = useMemo(
    () => (defaultAssignedTo.length > 0 ? defaultAssignedTo : familyMembers.slice(0, 1).map((member) => member.id)),
    [defaultAssignedTo, familyMembers],
  );
  const [reservationType, setReservationType] = useState<ManualReservationType>("flight");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [localDateTime, setLocalDateTime] = useState(localDateTimeDefault());
  const [location, setLocation] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>(defaultAssignees);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Add reservation manually</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Fill in the reservation details. This saves directly to your live trip timeline.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold dark:border-slate-700"
          >
            Close
          </button>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const normalizedTitle = title.trim();
            const normalizedProvider = provider.trim();
            const normalizedLocation = location.trim();
            if (!normalizedTitle || !normalizedProvider || !localDateTime.trim() || !normalizedLocation) {
              setFormError("Type, title, provider, date/time, and location are required.");
              return;
            }
            if (assignedTo.length === 0) {
              setFormError("Choose at least one family member.");
              return;
            }
            onSave({
              reservationType,
              title: normalizedTitle,
              provider: normalizedProvider,
              localDateTime: localDateTime.trim(),
              location: normalizedLocation,
              confirmationCode: confirmationCode.trim(),
              notes: notes.trim(),
              assignedTo,
            });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-300">Reservation type</span>
            <select
              value={reservationType}
              onChange={(event) => setReservationType(event.target.value as ManualReservationType)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
            >
              {RESERVATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-300">Title / reservation name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="UA 410 SFO to JFK, Marriott stay..."
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-300">Provider / restaurant / company</span>
            <input
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-300">Date and time</span>
            <input
              type="datetime-local"
              value={localDateTime}
              onChange={(event) => setLocalDateTime(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-300">Location / address</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-300">Confirmation code (optional)</span>
            <input
              value={confirmationCode}
              onChange={(event) => setConfirmationCode(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-300">Notes (optional)</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <fieldset className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Assigned to</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {familyMembers.map((member) => (
                <label key={member.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={assignedTo.includes(member.id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setAssignedTo((prev) => [...new Set([...prev, member.id])]);
                      } else {
                        setAssignedTo((prev) => prev.filter((entry) => entry !== member.id));
                      }
                    }}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          </fieldset>

          {formError ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              Save reservation
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
