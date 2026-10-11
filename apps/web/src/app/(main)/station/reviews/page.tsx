"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Star, ChatCircleText, ArrowBendDownRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function StationReviewsPage() {
  const qc = useQueryClient();

  const { data: stations } = useQuery<any[]>({
    queryKey: ["operator-stations"],
    queryFn: () => api.get("/api/operator/stations"),
  });

  const [stationId, setStationId] = useState("");

  useEffect(() => {
    if (stations && stations.length > 0 && !stationId) {
      setStationId(stations[0].id);
    }
  }, [stations, stationId]);

  const { data: reviewsData } = useQuery<{ reviews: any[] }>({
    queryKey: ["station-reviews", stationId],
    queryFn: () => api.get(`/api/stations/${stationId}/reviews`),
    enabled: !!stationId,
  });

  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      api.post(`/api/operator/reviews/${reviewId}/reply`, { reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["station-reviews", stationId] });
    },
  });

  const reviews = reviewsData?.reviews || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">Driver Reviews</h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Read driver experiences, feedback ratings, and post official operator responses
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-12 text-center shadow-sm">
          <Star size={32} className="mx-auto text-[#DADCE0] mb-2" />
          <p className="text-sm font-semibold text-[#202124]">No reviews received yet</p>
          <p className="text-xs text-[#5F6368] mt-1">Driver feedback will appear here as sessions complete.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-[#202124]">
                    {r.user?.name || "EV Driver"}
                  </p>
                  <p className="text-[11px] text-[#5F6368]">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[#F9AB00]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      weight={i < r.rating ? "fill" : "regular"}
                    />
                  ))}
                </div>
              </div>

              {r.comment && (
                <p className="text-xs text-[#202124] bg-[#F8F9FA] p-3 rounded-xl border border-[#DADCE0]">
                  "{r.comment}"
                </p>
              )}

              {/* Operator Reply */}
              {r.reply ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs">
                  <ArrowBendDownRight size={16} className="text-[#1A73E8] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#1A73E8] block text-[11px] uppercase">
                      Operator Response
                    </span>
                    <p className="text-[#202124] mt-0.5">{r.reply}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Write a response to this review..."
                    value={replyText[r.id] || ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    className="flex-1 text-xs h-9 px-3 rounded-xl border border-[#DADCE0] outline-none focus:border-[#1A73E8]"
                  />
                  <Button
                    size="sm"
                    className="h-9 px-4 text-xs bg-[#1A73E8] hover:bg-blue-600 text-white"
                    disabled={!replyText[r.id]}
                    onClick={() => {
                      if (replyText[r.id]) {
                        replyMutation.mutate({ reviewId: r.id, reply: replyText[r.id] });
                        setReplyText((prev) => ({ ...prev, [r.id]: "" }));
                      }
                    }}
                  >
                    Reply
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
