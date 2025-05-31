"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { api } from "~/trpc/react";

interface ScreenConfig {
  id: string;
  position: number;
  imageUrl: string | null;
  updatedAt: Date;
}

function HomeContent() {
  const [tvValue] = useQueryState("tv");

  // Poll for screen data every 15 seconds
  const { data: screens } = api.screen.getAll.useQuery(undefined, {
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  if (!screens) {
    return (
      <main className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-2xl">Loading...</div>
      </main>
    );
  }

  const sortedScreens = screens.sort((a, b) => a.position - b.position);

  // If no tv param or invalid value, show all three
  if (!tvValue || !["1", "2", "3"].includes(tvValue)) {
    return (
      <main className="h-screen w-screen grid grid-cols-3 grid-rows-1 relative">
        <Link
          href="/admin"
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm opacity-0 hover:opacity-100 transition-opacity"
        >
          Admin
        </Link>
        {sortedScreens.map((screen, index) => {
          const colors = ["bg-blue-500", "bg-green-500", "bg-red-500"];
          const bgColor = colors[index] || "bg-gray-500";

          return (
            <div
              key={screen.id}
              className={`flex items-center justify-center ${bgColor} text-white relative overflow-hidden group`}
            >
              {/* TV Number overlay */}
              <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                TV {screen.id}
              </div>

              {screen.imageUrl ? (
                <img
                  src={screen.imageUrl}
                  alt={`Screen ${screen.id}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="text-8xl font-bold">{screen.id}</span>
              )}

              {/* Fallback number overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-30 transition-opacity">
                <span className="text-8xl font-bold">{screen.id}</span>
              </div>
            </div>
          );
        })}
      </main>
    );
  }

  // Show only the selected screen
  const selectedScreen = sortedScreens.find((s) => s.id === tvValue);
  if (!selectedScreen) {
    return (
      <main className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-2xl">Screen not found</div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen relative">
      <Link
        href="/admin"
        className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm opacity-0 hover:opacity-100 transition-opacity"
      >
        Admin
      </Link>

      <div className="flex items-center justify-center bg-blue-500 text-white relative overflow-hidden h-full w-full group">
        {/* TV Number overlay */}
        <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          TV {selectedScreen.id}
        </div>

        {selectedScreen.imageUrl ? (
          <img
            src={selectedScreen.imageUrl}
            alt={`Screen ${selectedScreen.id}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="text-8xl font-bold">{selectedScreen.id}</span>
        )}

        {/* Fallback number overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-30 transition-opacity">
          <span className="text-8xl font-bold">{selectedScreen.id}</span>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="h-screen w-screen flex items-center justify-center bg-gray-900">
          <div className="text-white text-2xl">Loading...</div>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
