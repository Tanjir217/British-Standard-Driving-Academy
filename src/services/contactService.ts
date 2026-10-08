import { wixClient } from "./wix/client";

export type ContactEnquiry = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  source: "contact-page";
  submittedAt: string;
};

const CONTACT_ENQUIRIES_COLLECTION = "ContactEnquiries";

/**
 * Stores a public contact enquiry in Wix CMS.
 *
 * Configure the ContactEnquiries collection in Wix CMS with public insert
 * permission and private/admin-only read permission. The collection can then
 * be exported from Wix to Excel/CSV for the academy team.
 */
export async function submitContactEnquiry(
  enquiry: Omit<ContactEnquiry, "source" | "submittedAt">,
) {
  return wixClient.items.insert(CONTACT_ENQUIRIES_COLLECTION, {
    ...enquiry,
    source: "contact-page",
    submittedAt: new Date().toISOString(),
  });
}
