import { getAirtableClient } from "@/lib/airtable";
import { getStripe } from "@/lib/stripe/client";
import type { DriverFields } from "@/types/airtable/drivers";
import { updateDriverSchema } from "@/types/airtable/schemas";
import { getDriverById } from "./lookup";

export type GetOrCreateStripeCustomerInput = {
  driverId: string;
  phone: string;
  name?: string;
};

/** Retrieve or create a Stripe Customer keyed by the driver record. */
export async function getOrCreateStripeCustomer(
  input: GetOrCreateStripeCustomerInput,
): Promise<string> {
  const driver = await getDriverById(input.driverId);

  if (driver.fields.stripe_customer_id) {
    return driver.fields.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    phone: input.phone,
    name: input.name ?? undefined,
    metadata: { driverId: input.driverId },
  });

  const updateFields = updateDriverSchema.parse({
    stripe_customer_id: customer.id,
  });

  const client = getAirtableClient();
  await client.updateRecord<DriverFields>("drivers", input.driverId, updateFields, {
    typecast: true,
  });

  return customer.id;
}
