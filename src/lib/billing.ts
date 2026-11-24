/**
 * Billing is manual until a payment gateway is available.
 *
 * Mess Mates Pro is switched on by the team after a WhatsApp conversation, so
 * the app only ever shows the price and the contact number. The gateway block
 * below is intentionally disabled and unrendered: when bKash or Stripe is
 * available, flip `gateways.enabled`, fill in the merchant details and add the
 * checkout branch back into the upgrade sheet. Nothing else has to change,
 * because the entitlement itself is server-side (006_pro_entitlement.sql).
 */

export const billingConfig = {
  /** Shown in the upgrade sheet and on the Pro card. */
  price: '৳199 / month',
  contact: {
    /** As printed for members: 01797989412 (WhatsApp). */
    display: '01797989412',
    /** wa.me wants the country code and no leading zero. */
    whatsapp: '8801797989412',
  },
  gateways: {
    /** No gateway UI is rendered while this is false. */
    enabled: false,
    bkash: {
      enabled: false,
      merchant: '',
      sandbox: true,
    },
    stripe: {
      enabled: false,
      publishableKey: '',
      priceId: '',
    },
  },
} as const

export function whatsappLink(message: string): string {
  return `https://wa.me/${billingConfig.contact.whatsapp}?text=${encodeURIComponent(message)}`
}
