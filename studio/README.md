# OVIAN Sanity Studio

Content model for the storefront (see `schemas/index.ts`). Not installed by default.

1. Create a Sanity project at sanity.io/manage (free plan is enough to start).
2. `cd studio && npm install`
3. Set `SANITY_STUDIO_PROJECT_ID=<id>` (and `SANITY_STUDIO_DATASET=production`) in `studio/.env`.
4. `npm run dev` to open the Studio locally, `npm run deploy` to host it on `<name>.sanity.studio`.
5. In the storefront set `CONTENT_MODE=sanity`, `SANITY_PROJECT_ID`, `SANITY_DATASET`.
6. Add a Sanity webhook (on publish) -> `POST https://<site>/api/revalidate` with header `Authorization: Bearer <REVALIDATE_SECRET>`.

Restrict who can edit `shippingRates` (Sanity roles: give editors the "Editor" role and keep shipping edits to Administrators) because it affects order totals.
