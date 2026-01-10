import { env } from '../config/env.js';

class WhatsappService {
  private readonly phoneNumber: string;

  constructor() {
    const digitsOnly = env.whatsappSalesNumber.replace(/\D/g, '');

    if (!digitsOnly.length) {
      throw new Error('WHATSAPP_SALES_NUMBER must contain at least one digit');
    }

    this.phoneNumber = digitsOnly;
  }

  private buildLink(message: string) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${this.phoneNumber}?text=${encoded}`;
  }

  buildReservationLink(partName: string, refInternal: string) {
    const message = `Ola! Gostaria de reservar a peca ${partName} (referencia interna: ${refInternal}). Podem ajudar?`;
    return this.buildLink(message);
  }
}

export const whatsappService = new WhatsappService();
