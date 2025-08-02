"use client";

import { api } from "@/trpc/react";

export function LatestPost() {
  const { data: health } = api.post.health.useQuery();

  return (
    <div className="w-full max-w-xs">
      <p className="text-sm text-gray-400">
        API Status: {health?.status ?? "Loading..."}
      </p>
      <p className="text-xs text-gray-500">
        {health?.timestamp ? new Date(health.timestamp).toLocaleString() : ""}
      </p>
    </div>
  );
}
