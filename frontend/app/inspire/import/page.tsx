"use client";

import { useState } from "react";
import { ImportForm } from "@/components/import/ImportForm";
import { ImportResults } from "@/components/import/ImportResults";
import Link from "next/link";

interface ImportItemResult {
  input: string;
  status: "success" | "failed" | "duplicate";
  raw_item_id: string | null;
  title: string | null;
  type: "youtube_video" | "article" | "x_thread" | null;
  reason: string | null;
}

interface ImportResponse {
  results: ImportItemResult[];
  success_count: number;
  failed_count: number;
  duplicate_count: number;
}

export default function QuickImportPage() {
  const [results, setResults] = useState<ImportResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    urls: string[],
    xText: string | null,
    note: string | null,
  ) => {
    setIsSubmitting(true);
    setResults(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${API_URL}/api/v1/inspire/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "",
        },
        body: JSON.stringify({
          urls,
          x_text: xText,
          note,
        }),
      });
      const data: ImportResponse = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/inspire"
          className="text-sm text-[#8B98A5] hover:text-white"
        >
          ← Inspiration
        </Link>
        <h1
          className="text-2xl font-bold text-white mt-2"
          style={{ fontFamily: '"Bambino New", sans-serif' }}
        >
          Quick Import
        </h1>
        <p className="text-[#8B98A5] text-sm">
          Paste content into your pipeline
        </p>
      </div>

      <ImportForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

      {results && <ImportResults data={results} />}
    </div>
  );
}
