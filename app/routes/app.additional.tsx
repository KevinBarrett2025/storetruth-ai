import { feasibilityTodos } from "../storetruth/feasibility";

const architectureItems = [
  {
    label: "Scan runs",
    description:
      "Track queued, running, completed, and failed store readiness scans.",
  },
  {
    label: "Scan findings",
    description:
      "Capture source-backed product, policy, FAQ, question, and discovery gaps.",
  },
  {
    label: "Product readiness scoring",
    description:
      "Score deterministic completeness signals before any AI-assisted layer.",
  },
  {
    label: "Agent discovery checks",
    description:
      "Record public storefront discovery file reachability without ranking claims.",
  },
  {
    label: "AI question simulation",
    description:
      "Classify buyer questions as answered, partial, unanswered, risky, or missing source.",
  },
  {
    label: "Merchant-approved suggestions",
    description:
      "Keep recommendations in draft/review states until a merchant explicitly approves them.",
  },
];

export default function ArchitecturePage() {
  return (
    <s-page heading="StoreTruth Architecture">
      <s-section heading="Dry-run skeleton">
        <s-stack direction="block" gap="base">
          {architectureItems.map((item) => (
            <s-box
              key={item.label}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-heading>{item.label}</s-heading>
              <s-paragraph>{item.description}</s-paragraph>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Next feasibility spike">
        <s-unordered-list>
          {feasibilityTodos.map((todo) => (
            <s-list-item key={todo}>{todo}</s-list-item>
          ))}
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
