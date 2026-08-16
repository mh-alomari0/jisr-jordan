"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Calendar, Clock, MapPin, CheckCircle, Star } from "lucide-react";
import RatingModal from "@/components/common/RatingModal";

export interface Booking {
  id: string;
  customer_id: string;
  service_id: string;
  provider_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  phone: string;
  address: string;
  notes?: string | null;
  created_at: string;
  services?: {
    title: string;
    price: number;
  };
}

interface ReviewItem {
  booking_id: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ratedBookings, setRatedBookings] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("*, services(title, price)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (!bookingsError && bookingsData) {
      setBookings(bookingsData as Booking[]);
    }

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("booking_id")
      .eq("customer_id", user.id);

    if (reviewsData) {
      setRatedBookings(reviewsData.map((r: ReviewItem) => r.booking_id));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (isMounted) {
        await fetchBookings();
      }
    };

    init();

    const channelName = "customer_bookings_realtime";
    const existingChannel = supabase
      .getChannels()
      .find((ch: { topic: string }) => ch.topic === `realtime:${channelName}`);

    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">حجوزاتي</h1>

      {loading ? (
        <div className="text-center py-12 text-slate-500">جاري تحميل قائمة الحجوزات...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500">لا توجد لديك حجوزات حالية.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-900">
                    {booking.services?.title || "خدمة صيانة"}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      booking.status === "CONFIRMED"
                        ? "bg-emerald-50 text-emerald-700"
                        : booking.status === "PENDING"
                        ? "bg-amber-50 text-amber-700"
                        : booking.status === "COMPLETED"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {booking.status === "CONFIRMED"
                      ? "مؤكد"
                      : booking.status === "PENDING"
                      ? "قيد الانتظار"
                      : booking.status === "COMPLETED"
                      ? "مكتمل"
                      : booking.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {booking.booking_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {booking.start_time} - {booking.end_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {booking.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <span className="font-bold text-slate-900">
                  {booking.services?.price ? `${booking.services.price} د.أ` : "-"}
                </span>

                {booking.status === "COMPLETED" && (
                  ratedBookings.includes(booking.id) ? (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5" /> تم التقييم
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedBookingForRating(booking)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" /> تقييم الخدمة
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBookingForRating && (
        <RatingModal
          bookingId={selectedBookingForRating.id}
          serviceTitle={selectedBookingForRating.services?.title}
          isOpen={true}
          onClose={() => setSelectedBookingForRating(null)}
          onSuccess={() => {
            setSelectedBookingForRating(null);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}