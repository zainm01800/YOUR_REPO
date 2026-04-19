import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Bank Statement",
};

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4efe7] flex items-center justify-center px-4 py-12">
      {children}
    </div>
  );
}
