import logger from '../config/logger';

export class TelegramBotService {
  async sendRenewalReminder(userId: string, subscriptionName: string, daysUntilRenewal: number): Promise<void> {
    logger.info(`[TelegramBotService] Sending renewal reminder for ${subscriptionName} to user ${userId} (${daysUntilRenewal} days remaining)`);
    // TODO: Implement actual Telegram API call here
  }
}

export const telegramBotService = new TelegramBotService();
