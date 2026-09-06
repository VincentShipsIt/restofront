import { createRoot } from "react-dom/client";
import { ArticlesPanel } from "../../src/components/articles-panel";

createRoot(document.getElementById("root")!).render(
  <ArticlesPanel siteSlug="bakery" liveUrl="https://bakery.example" isPublished={new URLSearchParams(location.search).has("live")} />,
);
