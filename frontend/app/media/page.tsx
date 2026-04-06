"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MediaAsset {
  _id: string;
  cloudinaryPublicId: string;
  url: string;
  tags: string[];
  width: number;
  height: number;
  uploadedAt: number;
}

export default function MediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaAsset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTags = [...new Set(assets.flatMap((a) => a.tags))];

  const filteredAssets = selectedTag
    ? assets.filter((a) => a.tags.includes(selectedTag))
    : assets;

  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await fetch("/api/v1/media");
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAssets();
  }, []);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tags", uploadTags);
      formData.append("folder", "mandle");

      try {
        const response = await fetch("/api/v1/media", {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          const newAsset = await response.json();
          setAssets((prev) => [...prev, newAsset]);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
    setUploading(false);
    setShowUpload(false);
    setUploadTags("");
  };

  const handleDelete = async (asset: MediaAsset) => {
    try {
      const res = await fetch(`/api/v1/media/${asset._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a._id !== asset._id));
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const getTagCount = (tag: string) =>
    assets.filter((a) => a.tags.includes(tag)).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-bambino)" }}
          >
            Media Library
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-bambino)" }}
          >
            Media Library
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage images for posts
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          variant={showUpload ? "secondary" : "default"}
        >
          {showUpload ? "Cancel" : "Upload"}
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--hover)",
              }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
                className="hidden"
              />
              <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                Drag and drop images here, or click to select
              </p>
              <Button variant="secondary" size="sm">
                Select Files
              </Button>
              <div className="mt-4">
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="w-full max-w-md px-3 py-2 text-sm rounded-md border"
                  style={{
                    backgroundColor: "var(--app-bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              {uploading && (
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Uploading...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-6">
        <div
          className="w-[200px] shrink-0"
          style={{
            backgroundColor: "var(--card-bg)",
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            className="font-medium mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Filter by Tag
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedTag(null)}
              className="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors"
              style={{
                backgroundColor:
                  selectedTag === null ? "var(--blue-primary)" : "transparent",
                color:
                  selectedTag === null ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              All ({assets.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors"
                style={{
                  backgroundColor:
                    selectedTag === tag ? "var(--blue-primary)" : "transparent",
                  color:
                    selectedTag === tag ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                {tag} ({getTagCount(tag)})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {filteredAssets.length === 0 ? (
            <div
              className="text-center py-12 border-2 border-dashed rounded-lg"
              style={{ borderColor: "var(--border)" }}
            >
              <p style={{ color: "var(--text-secondary)" }}>No images found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset._id}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--border)",
                  }}
                  onClick={() => setSelectedImage(asset)}
                >
                  <img
                    src={asset.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  >
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(asset);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 right-0 p-2"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                    }}
                  >
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <Dialog
          open={!!selectedImage}
          onOpenChange={() => setSelectedImage(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={selectedImage.url}
                alt=""
                className="max-w-full max-h-[60vh] object-contain rounded"
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {selectedImage.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteConfirm(selectedImage);
                  setSelectedImage(null);
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </p>
            {deleteConfirm && (
              <div className="flex justify-center">
                <img
                  src={deleteConfirm.url}
                  alt=""
                  className="max-w-full max-h-48 object-contain rounded"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
