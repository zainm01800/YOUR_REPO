import { UploadForm } from "./upload-form";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function UploadPage({ params }: Props) {
  const { token } = await params;

  const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN?.trim();

  if (!UPLOAD_TOKEN || token !== UPLOAD_TOKEN) {
    return (
      <div className="w-full max-w-md">
        <div
          className="rounded-3xl bg-white p-8 text-center"
          style={{
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
            border: "1px solid rgba(221,208,191,0.4)",
          }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(159,42,59,0.08)]">
            <svg
              className="h-6 w-6 text-[#9f2a3b]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1b2428]">
            Invalid link
          </h1>
          <p className="mt-2 text-sm text-[#5f6b72]">
            This upload link is not valid or has expired. Please contact your
            accountant for a new link.
          </p>
        </div>
      </div>
    );
  }

  return <UploadForm />;
}
