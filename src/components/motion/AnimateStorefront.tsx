import React, { lazy, RefObject, Suspense } from "react";

// Shopping remains usable when motion code is delayed or cannot be downloaded.
const Motion = lazy(() =>
  import("./StorefrontMotion").catch(() => ({ default: () => null })),
);
export function AnimateStorefront(props: {
  root: RefObject<HTMLElement>;
  motionKey: string;
}) {
  return (
    <Suspense fallback={null}>
      <Motion {...props} />
    </Suspense>
  );
}
