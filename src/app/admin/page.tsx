"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";

interface ScreenConfig {
  id: string;
  position: number;
  imageUrl: string | null;
  updatedAt: Date;
}

interface ImageFile {
  name: string;
  size: number;
  lastModified: Date;
  url: string;
}

export default function AdminPage() {
  const [screens, setScreens] = useState<ScreenConfig[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: screensData, refetch: refetchScreens } =
    api.screen.getAll.useQuery();
  const { data: uploadedImages, refetch: refetchImages } =
    api.images.getAll.useQuery();

  // TV Numbers Control
  const { data: tvNumbersConfig } = api.screen.getShowTVNumbers.useQuery(
    undefined,
    {
      refetchInterval: 2000, // Refresh every 2 seconds in admin
    }
  );

  const updateOrderMutation = api.screen.updateOrder.useMutation({
    onSuccess: () => {
      refetchScreens();
    },
  });

  const updateImageMutation = api.screen.updateImage.useMutation({
    onSuccess: () => {
      refetchScreens();
      setSelectedScreen(null);
      setShowImageGallery(false);
    },
  });

  const resetImageMutation = api.screen.resetImage.useMutation({
    onSuccess: () => {
      refetchScreens();
    },
  });

  const resetAllImagesMutation = api.screen.resetAllImages.useMutation({
    onSuccess: () => {
      refetchScreens();
    },
  });

  const setShowTVNumbersMutation = api.screen.setShowTVNumbers.useMutation();

  const uploadImageMutation = api.images.upload.useMutation({
    onSuccess: () => {
      refetchImages();
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      setUploadProgress(null);
    },
  });

  const deleteImageMutation = api.images.delete.useMutation({
    onSuccess: () => {
      refetchImages();
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

  const handleToggleTVNumbers = (show: boolean) => {
    setShowTVNumbersMutation.mutate({ show });
  };

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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploadProgress("Uploading...");

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        await uploadImageMutation.mutateAsync({
          filename: file.name,
          data: base64Data,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(null);
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    if (selectedScreen) {
      updateImageMutation.mutate({
        id: selectedScreen,
        imageUrl: imageUrl,
      });
    }
  };

  const handleDeleteImage = async (imageName: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      await deleteImageMutation.mutateAsync({ name: imageName });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Show TV Numbers:
              </label>
              <button
                onClick={() =>
                  handleToggleTVNumbers(!tvNumbersConfig?.showTVNumbers)
                }
                disabled={setShowTVNumbersMutation.isPending}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  tvNumbersConfig?.showTVNumbers
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {tvNumbersConfig?.showTVNumbers ? "ON" : "OFF"}
              </button>
            </div>
            <button
              onClick={() => setShowImageGallery(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Manage Images
            </button>
            <button
              onClick={handleResetAllImages}
              disabled={resetAllImagesMutation.isPending}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              {resetAllImagesMutation.isPending
                ? "..."
                : "Reset All to Default"}
            </button>
          </div>
        </div>

        {/* Image Gallery Modal */}
        {showImageGallery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedScreen
                      ? `Select Image for TV ${selectedScreen}`
                      : "Image Gallery"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowImageGallery(false);
                      setSelectedScreen(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Upload Section */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Upload New Image</h3>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadImageMutation.isPending}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                      {uploadProgress || "Choose File"}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-600">
                    Supported formats: JPG, PNG, GIF, WebP, SVG, BMP
                  </p>
                </div>
              </div>

              {/* Images Grid */}
              <div className="p-6 overflow-y-auto max-h-96">
                {uploadedImages && uploadedImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {uploadedImages.map((image) => (
                      <div
                        key={image.name}
                        className="border rounded-lg overflow-hidden bg-white shadow-sm"
                      >
                        <div className="aspect-video bg-gray-100">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-image.png";
                            }}
                          />
                        </div>
                        <div className="p-3">
                          <p
                            className="text-sm font-medium text-gray-900 truncate"
                            title={image.name}
                          >
                            {image.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(image.size)}
                          </p>
                          <div className="flex space-x-2 mt-3">
                            {selectedScreen && (
                              <button
                                onClick={() => handleSelectImage(image.url)}
                                className="flex-1 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                              >
                                Select
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteImage(image.name)}
                              disabled={deleteImageMutation.isPending}
                              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-600">No images uploaded yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Upload your first image to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            Drag screens to reorder them. Upload images and select them for each
            screen, or use custom URLs.
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
                    {/* Select from uploaded images button */}
                    <button
                      onClick={() => {
                        setSelectedScreen(screen.id);
                        setShowImageGallery(true);
                      }}
                      className="w-full px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                    >
                      📸 Select from Gallery
                    </button>

                    <div className="text-center text-gray-500 text-xs">or</div>

                    <input
                      type="url"
                      value={imageUrls[screen.id] || ""}
                      onChange={(e) =>
                        handleImageUrlChange(screen.id, e.target.value)
                      }
                      onKeyPress={(e) => handleKeyPress(e, screen.id)}
                      placeholder={`Custom URL or default: /image${screen.id}.png`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleImageUrlSubmit(screen.id)}
                        disabled={updateImageMutation.isPending}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
                      >
                        {updateImageMutation.isPending ? "..." : "Set URL"}
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
