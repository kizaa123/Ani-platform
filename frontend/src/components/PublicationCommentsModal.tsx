"use client";

import { useState } from "react";
import { ResearchComment, ResearchPublication } from "@/lib/types";
import { Icon } from "@/components/icons";
import { ProfilePhoto } from "@/components/FarmerAvatar";
import { SpinnerLabel } from "@/components/LoadingPrimitives";
import { api } from "@/lib/api";

function formatCommentDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PublicationCommentsModalProps {
  publication: ResearchPublication;
  comments: ResearchComment[];
  commentsLoading: boolean;
  canComment: boolean;
  onClose: () => void;
  onCommentAdded: (comment: ResearchComment) => void;
}

export function PublicationCommentsModal({
  publication,
  comments,
  commentsLoading,
  canComment,
  onClose,
  onCommentAdded,
}: PublicationCommentsModalProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError("");
    try {
      const comment = await api.research.comments.add(publication.id, trimmed);
      onCommentAdded(comment);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-brand-900">{publication.title}</h2>
            <p className="mt-1 text-sm text-gray-500">Comments</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {commentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet. Be the first to share your thoughts.</p>
          ) : (
            <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-xl bg-gray-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white">
                      {comment.user.profilePicture ? (
                        <ProfilePhoto
                          src={comment.user.profilePicture}
                          name={comment.user.name}
                          size={28}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs font-bold text-gray-400">
                          {comment.user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{comment.user.name}</span>
                    <span className="text-xs text-gray-400">{formatCommentDate(comment.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-700">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}

          {canComment ? (
            <form onSubmit={handleSubmit} className="space-y-2">
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                rows={3}
                placeholder="Write a comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-50"
              >
                {submitting ? <SpinnerLabel label="Posting..." className="h-4 w-4" /> : "Post comment"}
              </button>
            </form>
          ) : (
            <p className="text-xs text-gray-500">Unlock this publication to join the discussion.</p>
          )}
        </div>
      </div>
    </div>
  );
}
