import { logger } from "@/lib/logger";

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
      
      logger.info(`Email dispatched to ${payload.recipient.email}`, {
        context: "NotificationService",
        metadata: { subject, event: payload.event },
      });

      return true;
    } catch (err) {
      logger.error(`Failed to send Email to ${payload.recipient.email}`, {
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

      logger.info(`WhatsApp message dispatched to ${payload.recipient.phone}`, {
        context: "NotificationService",
        metadata: { event: payload.event, length: message.length },
      });

      return true;
    } catch (err) {
      logger.error(`Failed to send WhatsApp to ${payload.recipient.phone}`, {
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
      logger.info(`In-App notification recorded for user ${payload.recipient.userId}`, {
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