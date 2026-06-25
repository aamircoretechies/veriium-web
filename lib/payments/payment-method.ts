import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { PaymentMethodMissingError } from "./errors";

function isDeletedCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): customer is Stripe.DeletedCustomer {
  return customer.deleted === true;
}

/** Resolve the saved card payment method for off-session charges. */
export async function resolveDefaultPaymentMethod(
  customerId: string,
): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);

  if (isDeletedCustomer(customer)) {
    throw new PaymentMethodMissingError(customerId);
  }

  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPm === "string") {
    return defaultPm;
  }
  if (defaultPm && typeof defaultPm === "object" && "id" in defaultPm) {
    return (defaultPm as Stripe.PaymentMethod).id;
  }

  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });

  const paymentMethodId = methods.data[0]?.id;
  if (!paymentMethodId) {
    throw new PaymentMethodMissingError(customerId);
  }

  return paymentMethodId;
}
