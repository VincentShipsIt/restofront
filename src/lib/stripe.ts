import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (stripe) return stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripe = new Stripe(secretKey, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
  return stripe;
}
