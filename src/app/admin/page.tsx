"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

interface ScreenConfig {
  id: string;
  position: number;
  imageUrl: string | null;
  updatedAt: Date;
}

export default function AdminPage() {
  const [screens, setScreens] = useState<ScreenConfig[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true);

  const { data: screensData, refetch } = api.screen.getAll.useQuery();
  const updateOrderMutation = api.screen.updateOrder.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const updateImageMutation = api.screen.updateImage.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const resetImageMutation = api.screen.resetImage.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const resetAllImagesMutation = api.screen.resetAllImages.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    if (screensData) {
      setScreens(screensData);
      const urls: Record<string, string> = {};
      screensData.forEach((screen) => {
        urls[screen.id] = screen.imageUrl || "";
      });
      setImageUrls(urls);
    }
  }, [screensData]);

  const handleDragStart = (e: React.DragEvent, screenId: string) => {
    setDraggedItem(screenId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const draggedIndex = screens.findIndex((s) => s.id === draggedItem);
    const targetIndex = screens.findIndex((s) => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newScreens = [...screens];
    const [draggedScreen] = newScreens.splice(draggedIndex, 1);
    newScreens.splice(targetIndex, 0, draggedScreen!);

    // Update positions
    const updatedScreens = newScreens.map((screen, index) => ({
      ...screen,
      position: index + 1,
    }));

    setScreens(updatedScreens);

    // Send update to server
    updateOrderMutation.mutate(
      updatedScreens.map((screen) => ({
        id: screen.id,
        position: screen.position,
      }))
    );

    setDraggedItem(null);
  };

  const handleImageUrlChange = (screenId: string, url: string) => {
    setImageUrls((prev) => ({ ...prev, [screenId]: url }));
  };

  const handleImageUrlSubmit = (screenId: string) => {
    const url = imageUrls[screenId]?.trim();
    updateImageMutation.mutate({
      id: screenId,
      imageUrl: url || null,
    });
  };

  const handleResetImage = (screenId: string) => {
    resetImageMutation.mutate({ id: screenId });
  };

  const handleResetAllImages = () => {
    resetAllImagesMutation.mutate();
  };

  const handleKeyPress = (e: React.KeyboardEvent, screenId: string) => {
    if (e.key === "Enter") {
      handleImageUrlSubmit(screenId);
    }
  };

  const getDefaultImageUrl = (screenId: string) => {
    return `/image${screenId}.png`;
  };

  const sortedScreens = screens.sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Screen Admin Panel
          </h1>
          <button
            onClick={handleResetAllImages}
            disabled={resetAllImagesMutation.isPending}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
          >
            {resetAllImagesMutation.isPending ? "..." : "Reset All to Default"}
          </button>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              Live Preview
            </h2>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                isPreviewCollapsed ? "" : "rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {!isPreviewCollapsed && (
            <div className="mt-4 space-y-6">
              <p className="text-gray-600 text-sm">
                This shows how your screens will appear in the viewer. Click any
                preview to open in a new tab.
              </p>

              {/* All Screens View */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  All Screens View (/)
                </h3>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border rounded-lg overflow-hidden bg-gray-900 hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ aspectRatio: "48/9" }}
                >
                  <div className="grid grid-cols-3 h-full">
                    {sortedScreens.map((screen, index) => {
                      const colors = [
                        "bg-blue-500",
                        "bg-green-500",
                        "bg-red-500",
                      ];
                      const bgColor = colors[index] || "bg-gray-500";

                      return (
                        <div
                          key={screen.id}
                          className={`relative ${bgColor} text-white flex items-center justify-center aspect-video`}
                        >
                          {screen.imageUrl ? (
                            <>
                              <img
                                src={screen.imageUrl}
                                alt={`Screen ${screen.id}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-30 transition-opacity">
                                <span className="text-4xl font-bold">
                                  {screen.id}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-4xl font-bold">
                              {screen.id}
                            </span>
                          )}
                          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-bold">
                            TV {screen.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </a>
              </div>

              {/* Individual Screen Views */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Individual Screens
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sortedScreens.map((screen, index) => {
                    const colors = [
                      "bg-blue-500",
                      "bg-green-500",
                      "bg-red-500",
                    ];
                    const bgColor = colors[index] || "bg-gray-500";

                    return (
                      <div key={screen.id} className="space-y-2">
                        <h4 className="font-medium text-gray-700">
                          TV {screen.id} (/?tv={screen.id})
                        </h4>
                        <a
                          href={`/?tv=${screen.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block relative ${bgColor} text-white rounded overflow-hidden hover:opacity-80 transition-opacity cursor-pointer`}
                          style={{ aspectRatio: "16/9" }}
                        >
                          {screen.imageUrl ? (
                            <>
                              <img
                                src={screen.imageUrl}
                                alt={`Screen ${screen.id}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-30 transition-opacity">
                                <span className="text-3xl font-bold">
                                  {screen.id}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-3xl font-bold">
                                {screen.id}
                              </span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-bold">
                            TV {screen.id}
                          </div>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Screen Configuration
          </h2>
          <p className="text-gray-600 mb-6">
            Drag screens to reorder them. Set image URLs for each screen.
            Default images are{" "}
            <code className="bg-gray-200 px-1 rounded">/image1.png</code>,{" "}
            <code className="bg-gray-200 px-1 rounded">/image2.png</code>,{" "}
            <code className="bg-gray-200 px-1 rounded">/image3.png</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sortedScreens.map((screen, index) => {
              const colors = [
                "border-blue-500 bg-blue-50",
                "border-green-500 bg-green-50",
                "border-red-500 bg-red-50",
              ];
              const colorClass = colors[index] || "border-gray-500 bg-gray-50";

              return (
                <div
                  key={screen.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, screen.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, screen.id)}
                  className={`
									p-4 border-2 border-dashed rounded-lg cursor-move
									hover:border-opacity-80 hover:bg-opacity-80 transition-all
									${colorClass}
									${draggedItem === screen.id ? "opacity-50" : ""}
								`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-8 h-8 ${
                          index === 0
                            ? "bg-blue-500"
                            : index === 1
                            ? "bg-green-500"
                            : "bg-red-500"
                        } text-white rounded flex items-center justify-center font-bold`}
                      >
                        {screen.id}
                      </div>
                      <span className="font-medium text-gray-700">
                        TV {screen.id} (Pos: {screen.position})
                      </span>
                    </div>
                    <div className="text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    </div>
                  </div>

                  {screen.imageUrl && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 flex items-center justify-between mb-2">
                        <span>Current image:</span>
                        {screen.imageUrl === getDefaultImageUrl(screen.id) && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ">
                            Default
                          </span>
                        )}
                      </div>
                      <img
                        src={screen.imageUrl}
                        alt={`Screen ${screen.id}`}
                        className="w-full h-32 object-cover rounded border aspect-video"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <input
                      type="url"
                      value={imageUrls[screen.id] || ""}
                      onChange={(e) =>
                        handleImageUrlChange(screen.id, e.target.value)
                      }
                      onKeyPress={(e) => handleKeyPress(e, screen.id)}
                      placeholder={`Default: /image${screen.id}.png`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleImageUrlSubmit(screen.id)}
                        disabled={updateImageMutation.isPending}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
                      >
                        {updateImageMutation.isPending ? "..." : "Set Image"}
                      </button>
                      <button
                        onClick={() => handleResetImage(screen.id)}
                        disabled={resetImageMutation.isPending}
                        className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 text-sm"
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Usage:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                • View all screens:{" "}
                <code className="bg-gray-200 px-1 rounded">/</code>
              </li>
              <li>
                • View screen 1:{" "}
                <code className="bg-gray-200 px-1 rounded">/?tv=1</code>
              </li>
              <li>
                • View screen 2:{" "}
                <code className="bg-gray-200 px-1 rounded">/?tv=2</code>
              </li>
              <li>
                • View screen 3:{" "}
                <code className="bg-gray-200 px-1 rounded">/?tv=3</code>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
