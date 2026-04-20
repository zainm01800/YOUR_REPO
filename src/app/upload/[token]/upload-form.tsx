"use client";

import { useState, useRef, useCallback } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

// Token comes from the page URL — the form needs it to call the right API
interface UploadFormProps {
  token: string;
}

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".ofx", ".qfx", ".qif"];
const ACCEPTED_MIME =
  "text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/x-ofx,application/x-qfx,.ofx,.qfx,.qif,.csv,.xlsx,.xls";
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function UploadForm({ token }: UploadFormProps) {
  const [clientName, setClientName] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setErrorMsg(
        `Unsupported file type. Please upload one of: ${ACCEPTED_EXTENSIONS.join(", ")}`
      );
      setState("error");
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      setState("error");
      return;
    }
    setFile(f);
    setErrorMsg("");
    if (state === "error") setState("idle");
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [state]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setErrorMsg("Please enter your name or business name.");
      setState("error");
      return;
    }
    if (!file) {
      setErrorMsg("Please select a file to upload.");
      setState("error");
      return;
    }

    setState("uploading");
    setErrorMsg("");

    try {
      const statementName = `${clientName.trim()} — ${file.name}`;
      const formData = new FormData();
      formData.append("statementFile", file);
      formData.append("name", statementName);
      formData.append("defaultCurrency", currency);

      const res = await fetch(`/api/upload/${encodeURIComponent(token)}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      setState("success");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="w-full max-w-md">
        <div
          className="rounded-3xl bg-white p-10 text-center"
          style={{
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
            border: "1px solid rgba(221,208,191,0.4)",
          }}
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(25,94,65,0.1)]">
            <svg
              className="h-8 w-8 text-[#195e41]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1b2428]">Thank you!</h1>
          <p className="mt-3 text-sm text-[#5f6b72] leading-relaxed">
            Your statement has been received. We&apos;ll take it from here —
            you can close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div
        className="rounded-3xl bg-white p-8"
        style={{
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
          border: "1px solid rgba(221,208,191,0.4)",
        }}
      >
        {/* Header */}
        <div className="mb-7">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#195e41]">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1b2428]">
            Submit your bank statement
          </h1>
          <p className="mt-1.5 text-sm text-[#5f6b72] leading-relaxed">
            Upload your bank statement and we&apos;ll take care of the rest. No
            account needed.
          </p>
        </div>

        {/* Error banner */}
        {state === "error" && errorMsg && (
          <div className="mb-5 rounded-2xl border border-[#e7b9c0] bg-[rgba(159,42,59,0.08)] px-4 py-3 text-sm text-[#9f2a3b]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name field */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#1b2428]">
              Your name or business name{" "}
              <span className="text-[#9f2a3b]">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John Smith or Acme Ltd"
              required
              className="h-11 w-full rounded-2xl border border-[#ddd0bf] bg-white px-4 text-sm text-[#1b2428] outline-none transition focus:border-[#b89d82] focus:ring-4 focus:ring-[rgba(25,94,65,0.12)]"
            />
          </div>

          {/* Currency selector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#1b2428]">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-11 w-full rounded-2xl border border-[#ddd0bf] bg-white px-4 text-sm text-[#1b2428] outline-none transition focus:border-[#b89d82] focus:ring-4 focus:ring-[rgba(25,94,65,0.12)]"
            >
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — US Dollar</option>
              <option value="AUD">AUD — Australian Dollar</option>
            </select>
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#1b2428]">
              Bank statement file <span className="text-[#9f2a3b]">*</span>
            </label>
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors"
              style={{
                borderColor: dragging
                  ? "#195e41"
                  : file
                  ? "rgba(25,94,65,0.5)"
                  : "#ddd0bf",
                backgroundColor: dragging
                  ? "rgba(25,94,65,0.04)"
                  : file
                  ? "rgba(25,94,65,0.03)"
                  : "transparent",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MIME}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <div>
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(25,94,65,0.1)]">
                    <svg
                      className="h-5 w-5 text-[#195e41]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#1b2428]">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#5f6b72]">
                    {(file.size / 1024).toFixed(0)} KB &middot; Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#f4efe7]">
                    <svg
                      className="h-5 w-5 text-[#5f6b72]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#1b2428]">
                    Drop your file here, or{" "}
                    <span className="text-[#195e41]">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-[#5f6b72]">
                    CSV, XLSX, XLS, OFX, QFX, QIF
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={state === "uploading"}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#195e41] px-5 text-sm font-semibold text-[#f6f7f3] transition duration-150 hover:bg-[#0f4e35] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              boxShadow: "0 12px 32px rgba(23,95,65,0.18)",
            }}
          >
            {state === "uploading" ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Uploading…
              </>
            ) : (
              "Submit statement"
            )}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-[#5f6b72]">
        Your file is handled securely and used only for bookkeeping purposes.
      </p>
    </div>
  );
}
