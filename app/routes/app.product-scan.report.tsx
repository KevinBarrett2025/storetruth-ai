import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { createReadOnlyProductReadinessReport } from "../storetruth/product-scan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  assertDeveloperOnlyRoute();
  const { admin, session } = await authenticate.admin(request);
  const report = await createReadOnlyProductReadinessReport({
    adminGraphql: admin.graphql,
    shopDomain: session.shop,
  });

  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};

function assertDeveloperOnlyRoute() {
  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV === "production") {
    throw new Response("Not found", { status: 404 });
  }
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
