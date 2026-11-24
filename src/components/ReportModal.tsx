import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { submitReport } from '@/src/lib/api';
import { getUserFriendlyError } from '@/src/lib/firebase';
import { useAuth } from '@/src/context/AuthContext';
import type { ReportTargetType } from '@/src/types/plusone';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  activityId?: string;
}

const REPORT_REASONS = [
  'Private or unsafe meeting location',
  'Harassment or disrespectful behavior',
  'Spam, solicitation, or commercial promotion',
  'Misleading activity details',
  'Under-18 safety concern',
  'Other community guideline violation',
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
  activityId,
}: ReportModalProps) {
  const { firebaseUser } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason(REPORT_REASONS[0]);
      setDescription('');
      setSubmitted(false);
      setError('');
    }
  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) {
      setError('Please sign in to submit a report.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitReport(
        firebaseUser.uid,
        targetType,
        targetId,
        reason,
        description,
        activityId
      );
      setSubmitted(true);
    } catch (err) {
      setError(getUserFriendlyError(err, 'Unable to submit report.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080808]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white border border-[#E5E3DD] rounded-[24px] max-w-md w-full p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#080808]" strokeWidth={1.75} />
            <h2
              id="report-modal-title"
              className="font-display text-lg font-semibold tracking-[-0.02em]"
            >
              Report {targetType}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1.5 rounded-full hover:bg-[#F0EEE8] text-[#747474] hover:text-[#080808] transition-colors cursor-pointer"
            aria-label="Close report dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-4 text-center space-y-5">
            <CheckCircle2
              className="w-7 h-7 text-[#166534] mx-auto"
              strokeWidth={1.6}
            />
            <div>
              <h3 className="font-display font-semibold text-base tracking-[-0.015em] mb-1.5">
                Report received
              </h3>
              <p className="text-sm text-[#747474] leading-relaxed">
                Thank you for helping keep PlusOne respectful. Our moderation team
                will review this report privately.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-[#080808] text-[#F8F6F0] py-2.5 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[#747474]">
              Reporting: <span className="font-medium text-[#080808]">{targetLabel}</span>
            </p>

            <div>
              <label
                htmlFor="report-reason"
                className="block text-xs font-medium text-[#080808] mb-1.5"
              >
                Reason
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 py-2.5 text-sm text-[#080808] focus:bg-white focus:border-[#080808] focus:outline-none transition-colors"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="report-desc"
                className="block text-xs font-medium text-[#080808] mb-1.5"
              >
                Additional details (optional)
              </label>
              <textarea
                id="report-desc"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share context so a reviewer can take appropriate action..."
                className="w-full rounded-xl border border-[#E5E3DD] bg-[#F8F6F0] px-3.5 py-2.5 text-sm text-[#080808] focus:bg-white focus:border-[#080808] focus:outline-none transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#E5E3DD] px-5 py-2 text-sm font-medium text-[#080808] hover:bg-[#F0EEE8] active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2 text-sm font-medium hover:bg-[#222] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
