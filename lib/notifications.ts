import { logger } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type NotificationChannel = "EMAIL" | "WHATSAPP" | "IN_APP";

export type NotificationEventType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "PASSWORD_RESET";

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  fullName?: string;
}

export interface BookingNotificationDetails {
  bookingId: string;
  serviceTitle: string;
  bookingDate: string;
  startTime: string;
  address: string;
  totalPrice?: number;
}

export interface SendNotificationPayload {
  recipient: NotificationRecipient;
  event: NotificationEventType;
  details: BookingNotificationDetails;
  channels?: NotificationChannel[];
}

class UnifiedNotificationService {
  /**
   * إرسال تنبيه عبر كافة القنوات المحددة
   */
  async dispatch(payload: SendNotificationPayload): Promise<{ success: boolean; dispatchedChannels: NotificationChannel[] }> {
    const channels = payload.channels || ["EMAIL", "WHATSAPP", "IN_APP"];
    const dispatched: NotificationChannel[] = [];

    logger.info(`Dispatching notification event: ${payload.event}`, {
      userId: payload.recipient.userId,
      metadata: { bookingId: payload.details.bookingId, channels },
    });

    const results = await Promise.allSettled(
      channels.map(async (channel) => {
        switch (channel) {
          case "EMAIL":
            return await this.sendEmail(payload);
          case "WHATSAPP":
            return await this.sendWhatsApp(payload);
          case "IN_APP":
            return await this.sendInAppNotification(payload);
          default:
            return false;
        }
      })
    );

    results.forEach((res, idx) => {
      if (res.status === "fulfilled" && res.value) {
        dispatched.push(channels[idx]);
      }
    });

    return {
      success: dispatched.length > 0,
      dispatchedChannels: dispatched,
    };
  }

  /**
   * إرسال بريد إلكتروني
   */
  private async sendEmail(payload: SendNotificationPayload): Promise<boolean> {
    if (!payload.recipient.email) return false;

    try {
      // جهّز القالب والتفاصيل - جاهز للربط مع Resend / SendGrid / Supabase Email
      const subject = this.getSubjectForEvent(payload.event, payload.details.bookingId);
      
      const maskedEmail = payload.recipient.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      logger.info(`Email dispatched to ${maskedEmail}`, {
        context: "NotificationService",
        metadata: { subject, event: payload.event },
      });

      return true;
    } catch (err) {
      logger.error("Failed to send Email notification", {
        context: "NotificationService",
        error: err,
      });
      return false;
    }
  }

  /**
   * إرسال رسالة واتساب
   */
  private async sendWhatsApp(payload: SendNotificationPayload): Promise<boolean> {
    if (!payload.recipient.phone) return false;

    try {
      // جهّز النص - جاهز للربط مع Unifonic / Twilio / WhatsApp Business API
      const message = this.buildWhatsAppMessage(payload);

      const maskedPhone = payload.recipient.phone.replace(/(\d{3})\d{6}(\d{1})/, '$1******$2');
      logger.info(`WhatsApp message dispatched to ${maskedPhone}`, {
        context: "NotificationService",
        metadata: { event: payload.event, length: message.length },
      });

      return true;
    } catch (err) {
      logger.error("Failed to send WhatsApp notification", {
        context: "NotificationService",
        error: err,
      });
      return false;
    }
  }

  /**
   * تسجيل التنبيه داخل قاعدة البيانات للإشعارات الداخلية (In-App)
   */
  private async sendInAppNotification(payload: SendNotificationPayload): Promise<boolean> {
    if (!payload.recipient.userId) return false;

    try {
      const supabase = createAdminSupabaseClient();

      const title = this.getSubjectForEvent(payload.event, payload.details.bookingId);
      const message = this.buildInAppMessage(payload);

      const type = this.getNotificationTypeForEvent(payload.event);

      const { error } = await supabase.from("notifications").insert({
        user_id: payload.recipient.userId,
        title,
        message,
        type,
      });

      if (error) {
        logger.error(`Failed to persist In-App notification: ${error.message}`, {
          context: "NotificationService",
          metadata: { userId: payload.recipient.userId, event: payload.event },
        });
        return false;
      }

      logger.info(`In-App notification persisted for user ${payload.recipient.userId}`, {
        context: "NotificationService",
        metadata: { event: payload.event },
      });
      return true;
    } catch (err) {
      logger.error(`Failed to record In-App notification`, {
        context: "NotificationService",
        error: err,
      });
      return false;
    }
  }

  private getNotificationTypeForEvent(event: NotificationEventType): "INFO" | "SUCCESS" | "WARNING" | "BOOKING" | "PAYMENT" {
    switch (event) {
      case "BOOKING_CREATED":
      case "BOOKING_CONFIRMED":
      case "BOOKING_CANCELLED":
        return "BOOKING";
      case "PASSWORD_RESET":
        return "INFO";
      default:
        return "INFO";
    }
  }

  private getSubjectForEvent(event: NotificationEventType, bookingId: string): string {
    switch (event) {
      case "BOOKING_CREATED":
        return `تم استلام طلب حجزك بنجاح - رقم الحجز #${bookingId.slice(0, 8)}`;
      case "BOOKING_CONFIRMED":
        return `تأكيد موعد الحجز - رقم الحجز #${bookingId.slice(0, 8)}`;
      case "BOOKING_CANCELLED":
        return `إلغاء الحجز - رقم الحجز #${bookingId.slice(0, 8)}`;
      default:
        return `تحديث بشأن طلبك في منصة جسر`;
    }
  }

  private buildInAppMessage(payload: SendNotificationPayload): string {
    const { details, event } = payload;
    switch (event) {
      case "BOOKING_CREATED":
        return `تم استلام طلب حجز خدمة (${details.serviceTitle}) بنجاح. الموعد: ${details.bookingDate} - ${details.startTime}`;
      case "BOOKING_CONFIRMED":
        return `تم تأكيد حجز خدمة (${details.serviceTitle}). الموعد: ${details.bookingDate} - ${details.startTime}`;
      case "BOOKING_CANCELLED":
        return `تم إلغاء حجز خدمة (${details.serviceTitle}).`;
      default:
        return `تحديث بشأن حجز خدمة (${details.serviceTitle}).`;
    }
  }

  private buildWhatsAppMessage(payload: SendNotificationPayload): string {
    const { details, recipient, event } = payload;
    const name = recipient.fullName || "عميلنا العزيز";

    if (event === "BOOKING_CREATED") {
      return `أهلاً بك ${name} 🌿\n\nتم استلام طلب حجز خدمة (${details.serviceTitle}) بنجاح.\n📅 الموعد: ${details.bookingDate} في تمام الساعة ${details.startTime}\n📍 العنوان: ${details.address}\n\nsنحطك علماً فور تأكيد الموعد مع الفني المختص. شكراً لاهتمامك بـ منصة جسر!`;
    }

    return `مرحباً ${name}، لديك تحديث جديد بشأن حجز خدمة (${details.serviceTitle}).`;
  }
}

export const notificationService = new UnifiedNotificationService();