# Contact Page Enquiry Setup

The public Contact page now has three clear paths:

1. **WhatsApp** — opens a direct WhatsApp conversation with BSDA.
2. **Gmail** — opens Gmail compose. Set `VITE_BSDA_CONTACT_EMAIL` to prefill the BSDA recipient.
3. **Contact form** — saves visitor details to the Wix CMS `ContactEnquiries` collection.

## Wix CMS collection

Create a custom Wix CMS collection with this ID:

`ContactEnquiries`

Recommended fields:

| Field | Type |
|---|---|
| name | Text |
| email | Text |
| phone | Text |
| message | Rich Text/Text |
| source | Text |
| submittedAt | Date/Time |

Permissions:

- **Insert:** Anyone
- **Read:** Admin/CMS only
- **Update:** Admin/CMS only
- **Delete:** Admin/CMS only

The browser only inserts a new enquiry. Visitors should never be given read access to the collection.

Wix Data collection permissions control who can insert and read collection items. The frontend insert call therefore requires the collection's insert permission to allow site visitors. See the Wix Data API documentation for the permission model.

## Excel workflow

The stored Wix CMS records are the persistent source for contact enquiries. From the Wix CMS, the academy team can export the collection to CSV and open it directly in Microsoft Excel.

If the requirement is a **live Microsoft Excel Online workbook** where every submission is automatically appended to an Excel table, a Microsoft Power Automate/Graph webhook or another server-side integration must be configured. No Excel account/workbook URL or webhook was present in the repository, so no external credential or secret has been hard-coded into the frontend.

## Gmail recipient

Set the frontend environment variable:

`VITE_BSDA_CONTACT_EMAIL=your-bsda-gmail-address`

Without this value, the Gmail button still opens a new Gmail compose window, but the recipient is left for the visitor to enter.
