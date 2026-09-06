"use client";

import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Sparkles, X, Check, Loader2 } from "lucide-react";
import type { PredictorProfile } from "@credence/shared";

import { ModalShell } from "./modal-shell";
import { PredictorAvatar } from "./predictor-avatar";
import { useUpdateProfile } from "@/hooks/use-profile";
import { apiErrorMessage } from "@/services/api";
import { usersService } from "@/services/users.service";

export function EditProfileDialog({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: PredictorProfile;
}) {
  if (!isOpen) return null;

  return (
    <ModalShell titleId="edit-profile-title" onClose={onClose}>
      <div className="flex flex-col overflow-hidden bg-[#0B0C0E]">
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0F1012] px-6 py-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">Identity</span>
            <h2 id="edit-profile-title" className="text-lg font-medium text-foreground">
              Edit Profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit profile"
            className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-white/[0.05] hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <EditProfileForm
          key={`${user.walletAddress}-${user.displayName ?? ""}-${user.avatarUrl ?? ""}`}
          onClose={onClose}
          user={user}
        />
      </div>
    </ModalShell>
  );
}

function EditProfileForm({
  onClose,
  user,
}: {
  onClose: () => void;
  user: PredictorProfile;
}) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [urlInput, setUrlInput] = useState(user.avatarUrl ?? "");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateProfile();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Please select a PNG, JPG or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      setAvatarUrl(await usersService.uploadAvatar(file));
      setUrlInput("");
    } catch (caught) {
      setError(apiErrorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setAvatarUrl(urlInput.trim());
      setShowUrlInput(false);
      setError(null);
    }
  };

  const handleResetToGenerative = () => {
    setAvatarUrl("");
    setUrlInput("");
    setShowUrlInput(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setError(null);

    const trimmedName = displayName.trim();
    if (trimmedName.length > 24) {
      setError("Display name cannot exceed 24 characters.");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        displayName: trimmedName,
        avatarUrl,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const hasChanges =
    (displayName.trim() || undefined) !== (user.displayName ?? undefined) ||
    (avatarUrl || undefined) !== (user.avatarUrl ?? undefined);

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
      {uploading && <p role="status" className="text-sm text-signal">Uploading photo to Cloudinary…</p>}
      <fieldset disabled={uploading || updateProfile.isPending} className="space-y-6 disabled:opacity-60">
      <div>
        <p className="text-[13px] text-muted leading-relaxed">
          Customize your public persona, callsign, and avatar across Credence.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs font-mono text-rose-300">
          {error}
        </div>
      )}

      {/* Avatar customizer */}
      <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <label className="block font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Profile Avatar
        </label>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Live avatar preview */}
          <div className="relative group shrink-0">
            <PredictorAvatar
              address={user.walletAddress}
              name={displayName || user.displayName}
              avatarUrl={avatarUrl}
              className="size-20 text-xl ring-2 ring-white/10 transition-transform duration-200 group-hover:scale-105"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              title="Upload new image"
            >
              <Camera className="size-5" />
            </button>
          </div>

          {/* Avatar action buttons */}
          <div className="flex flex-1 flex-col gap-2 w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Upload profile avatar"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.08] hover:border-white/20"
              >
                <Camera className="size-3.5 text-signal" />
                Upload Photo
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.08] hover:border-white/20"
              >
                <ImageIcon className="size-3.5 text-muted" />
                Image Link
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleResetToGenerative}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground hover:bg-white/[0.08]"
                >
                  <Sparkles className="size-3.5 text-signal" />
                  Generative Default
                </button>
              )}
            </div>

            {/* Direct image link input drawer */}
            {showUrlInput && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://.../avatar.png"
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted/50 focus:border-signal focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="rounded-lg border border-signal/40 bg-signal/10 px-3 py-1.5 font-mono text-xs text-signal hover:bg-signal/20"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(false)}
                  className="p-1.5 text-muted hover:text-foreground"
                  aria-label="Cancel image URL"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            <p className="text-[11px] text-muted/70">
              JPG, PNG or WebP, up to 2 MB. Photos are stored on Cloudinary.
            </p>
          </div>
        </div>
      </div>

      {/* Display Name Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="display-name"
            className="block font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
          >
            Display Name
          </label>
          <span className="font-mono text-[10px] text-muted">
            {displayName.length}/24
          </span>
        </div>

        <div className="relative">
          <input
            id="display-name"
            type="text"
            value={displayName}
            maxLength={24}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. SatoshiCall, AlphaWhale"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/40 transition-colors focus:border-signal focus:bg-white/[0.05] focus:outline-none"
          />
        </div>

        <p className="text-[11px] text-muted/70">
          Visible on your profile, prediction cards, and the global leaderboard. Leave empty to display truncated address.
        </p>
      </div>

      {/* Wallet Address (Read-only reference) */}
      <div className="space-y-1.5 border-t border-white/5 pt-4">
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted/60">
          Linked Wallet
        </span>
        <p className="font-mono text-xs text-muted/80 break-all">
          {user.walletAddress}
        </p>
      </div>

      {/* Dialog Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={updateProfile.isPending}
          className="brand-button-secondary px-5 py-2 text-xs"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!hasChanges || updateProfile.isPending || success}
          className="brand-button inline-flex items-center gap-2 px-6 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateProfile.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Saving…
            </>
          ) : success ? (
            <>
              <Check className="size-3.5 text-signal" />
              Updated!
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
      </fieldset>
    </form>
  );
}
