import { notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { BookingFlow } from "@/components/booking-flow";
import { getServiceFromDb } from "@/lib/services-db";

export default async function BookingPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const service = await getServiceFromDb(type);
  if (!service) notFound();
  return <CustomerShell><BookingFlow service={service} /></CustomerShell>;
}
